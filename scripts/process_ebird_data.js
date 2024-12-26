// @ts-check
const fs = require("fs");
const csv = require("csv-parser");
const { format } = require("path");

const ebirdInputFile = "c:/Users/rduen/my-website/scripts/MyEBirdData.csv";
const taxonomyFile =
  "c:/Users/rduen/my-website/scripts/eBird_taxonomy_v2024.csv";
const mlFile = "c:/Users/rduen/my-website/scripts/ML_USER4436073.csv";
const ebirdOutputFile = "c:/Users/rduen/my-website/scripts/ebirdData.json";
const countrySummaryOutputFile =
  "c:/Users/rduen/my-website/static/country_summary.json";
const countrySpeciesOutputFile =
  "c:/Users/rduen/my-website/static/country_for_species.json";
const cacheFile = "c:/Users/rduen/my-website/scripts/wikiCache.json"; // Cache file path

let dataDict = {};
const speciesCodeMap = {};
const countrySpeciesCount = {};
const speciesCountryCount = {};
const mlDataMap = {};
let cache = {};

// Load cache from file
const loadCache = () => {
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
  }
};

// Save cache to file
const saveCache = () => {
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), "utf-8");
};

async function fetchWikipediaInformation(title) {
  const fetch = (await import("node-fetch")).default; // Use dynamic import for node-fetch
  const url = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts|pageimages|info&exintro=&explaintext=&piprop=original&inprop=url&titles=${encodeURIComponent(
    title
  )}&redirects`;
  const response = await fetch(url);
  const data = await response.json();
  const pages = data.query.pages;
  const page = Object.values(pages)[0];
  if (page.missing !== undefined) {
    return undefined;
  } else {
    return {
      description: page.extract.trim(),
      image: page.original,
      wikipediaUrl: page.fullurl,
    };
  }
}

async function fetchMetadata({ sciName, primaryComName }) {
  if (cache[sciName]) {
    return cache[sciName]; // Return cached data if available
  }

  console.info(`Cache missing ${sciName}, fetching data from Wikipedia`);

  let metadata = await fetchWikipediaInformation(sciName);

  if (metadata === undefined) {
    console.warn(
      `No Wikipedia page found for Scientific Name "${sciName}", fetching using primary common name "${primaryComName}" instead`
    );
    metadata = await fetchWikipediaInformation(primaryComName);
    if (metadata === undefined) {
      console.error(
        `No Wikipedia page found for primary common name "${primaryComName}" either`
      );
      return;
    }
    metadata.primaryComNameUsed = true;
  }

  cache[sciName] = metadata; // Cache the fetched data
  saveCache(); // Save the cache to file

  return metadata;
}

// Function to convert keys to camelCase and remove text within parentheses
const toCamelCase = (str) => {
  return str
    .replace(/\s*\(.*?\)\s*/g, "") // Remove text within parentheses
    .toLowerCase()
    .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
      index === 0 ? match.toLowerCase() : match.toUpperCase()
    )
    .replace(/\s+/g, "");
};

// Function to read CSV file and return a promise
const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
};

// Function to process ML data
const processMLData = async () => {
  const mlData = await readCSV(mlFile);
  mlData.forEach((row) => {
    const camelCaseRow = {};
    for (const key in row) {
      camelCaseRow[toCamelCase(key)] = row[key];
    }
    const mlCatalogNumber = camelCaseRow["MlCatalogNumber"];
    mlDataMap[mlCatalogNumber] = camelCaseRow;
  });
};

// Function to process taxonomy data
const processTaxonomyData = async () => {
  const taxonomyData = await readCSV(taxonomyFile);
  taxonomyData.forEach((row) => {
    const speciesCode = row["SPECIES_CODE"];
    speciesCodeMap[row["SCI_NAME"]] = speciesCode;
    dataDict[speciesCode] = {
      taxonOrder: row["TAXON_ORDER"],
      category: row["CATEGORY"],
      speciesCode: row["SPECIES_CODE"],
      taxonConceptId: row["TAXON_CONCEPT_ID"],
      primaryComName: row["PRIMARY_COM_NAME"],
      sciName: row["SCI_NAME"],
      order: row["ORDER"],
      family: row["FAMILY"],
      speciesGroup: row["SPECIES_GROUP"],
      reportAs: row["REPORT_AS"],
      observations: [],
    };
  });
};

// Function to process eBird data
const processEBirdData = async () => {
  const ebirdData = await readCSV(ebirdInputFile);
  ebirdData.forEach((row) => {
    const scientificName = row["Scientific Name"];
    const speciesCode = speciesCodeMap[scientificName];
    if (!speciesCode) {
      console.warn(
        `No species code found for scientific name: ${scientificName}`
      );
      return;
    }
    // Combine Date and Time into a single DateTime field
    row["DateTime"] = new Date(`${row["Date"]} ${row["Time"]}`);

    // Remove Date and Time fields
    delete row["Date"];
    delete row["Time"];

    // Convert keys to camelCase and remove text within parentheses
    const camelCaseRow = {};
    for (const key in row) {
      camelCaseRow[toCamelCase(key)] = row[key];
    }

    camelCaseRow["speciesCode"] = speciesCode;
    camelCaseRow["speciesCategory"] = dataDict[speciesCode].category;

    dataDict[speciesCode].observations.push(camelCaseRow);

    // Update state species count
    const country = camelCaseRow["state/Province"].split("-")[0];
    if (!countrySpeciesCount[country]) {
      countrySpeciesCount[country] = new Set();
    }
    countrySpeciesCount[country].add(speciesCode);

    // Update country species count
    if (!speciesCountryCount[speciesCode]) {
      speciesCountryCount[speciesCode] = {};
    }
    if (!speciesCountryCount[speciesCode][country]) {
      speciesCountryCount[speciesCode][country] = new Set();
    }
    speciesCountryCount[speciesCode][country].add(camelCaseRow["locationId"]);
  });
};

const rollupSpecies = () => {
  const speciesData = {};
  Object.values(dataDict)
    .filter(({ category }) => category === "species")
    .forEach((record) => {
      const { speciesCode } = record;
      speciesData[speciesCode] = record;
      speciesData[speciesCode].observations.sort(
        (a, b) => a["datetime"] - b["datetime"]
      );
    });
  Object.values(dataDict)
    .filter(
      ({ category, observations, reportAs }) =>
        (category === "issf" || category === "domestic") &&
        observations.length > 0 &&
        reportAs !== ""
    )
    .forEach((record) => {
      const { reportAs } = record;
      if (speciesData[reportAs] === undefined) {
        speciesData[reportAs] = dataDict[reportAs];
      }
      speciesData[reportAs].observations = speciesData[reportAs].observations
        .concat(record.observations)
        .sort((a, b) => a["datetime"] - b["datetime"]);
    });

  dataDict = speciesData;
};

// Function to remove entries without observations
const removeEmptyEntries = () => {
  for (const key in dataDict) {
    if (dataDict[key].observations.length === 0) {
      delete dataDict[key];
    }
  }
};

const fetchBirdMetadata = async () => {
  // let counter = 0;
  for (const key in dataDict) {
    if (dataDict[key].category !== "species") {
      dataDict[key].metadata = { description: "Not available" };
      continue;
    }
    dataDict[key].metadata = await fetchMetadata(dataDict[key]);
  }
};
// Function to replace mlCatalogNumbers with metadata objects
const replaceMlCatalogNumbers = () => {
  for (const key in dataDict) {
    dataDict[key].photographed = false;
    dataDict[key].recorded = false;
    dataDict[key].observations.forEach((observation) => {
      if (observation.mlCatalogNumbers) {
        observation.mlCatalogNumbers = observation.mlCatalogNumbers
          .split(" ")
          .map((id) => mlDataMap[id] || id);
        dataDict[key].photographed ||=
          observation.mlCatalogNumbers.filter(
            ({ format }) => format === "Photo"
          ).length > 0;

        dataDict[key].recorded ||=
          observation.mlCatalogNumbers.filter(
            ({ format }) => format === "Audio"
          ).length > 0;
      }
    });
    if (dataDict[key].photographed) {
      dataDict[key].bestPhoto = dataDict[key].observations
        .flatMap((obs) => obs.mlCatalogNumbers)
        .filter((item) => item && item.format === "Photo")
        .reduce((best, item) => {
          if (
            !best ||
            parseFloat(item.averageCommunityRating) >
              parseFloat(best.averageCommunityRating)
          ) {
            return item;
          }
          return best;
        }, null);
    }
    if (dataDict[key].recorded) {
      dataDict[key].bestRecording = dataDict[key].observations
        .flatMap((obs) => obs.mlCatalogNumbers)
        .filter((item) => item && item.format === "Audio")
        .reduce((best, item) => {
          if (
            !best ||
            parseFloat(item.averageCommunityRating) >
              parseFloat(best.averageCommunityRating)
          ) {
            return item;
          }
          return best;
        }, null);
    }
  }
};

// Function to sort observations by DateTime
const sortObservations = () => {
  for (const key in dataDict) {
    dataDict[key].observations.sort((a, b) => {
      return (
        new Date(a["dateTime"]).getTime() - new Date(b["dateTime"]).getTime()
      );
    });
  }
};

// Function to write JSON data to file
const writeJSONToFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`JSON data has been written to ${filePath}`);
};

// Function to create summary data
const createSummaryData = () => {
  const countrySummary = {};
  for (const country in countrySpeciesCount) {
    countrySummary[country] = countrySpeciesCount[country].size;
  }
  writeJSONToFile(countrySummaryOutputFile, countrySummary);

  const countrySpeciesSummary = {};
  for (const species in speciesCountryCount) {
    countrySpeciesSummary[species] = {};
    for (const country in speciesCountryCount[species]) {
      countrySpeciesSummary[species][country] =
        speciesCountryCount[species][country].size;
    }
  }
  writeJSONToFile(countrySpeciesOutputFile, countrySpeciesSummary);
};

// Main function to process all data
const main = async () => {
  loadCache(); // Load cache from file
  await processMLData();
  await processTaxonomyData();
  await processEBirdData();
  rollupSpecies();
  removeEmptyEntries();
  await fetchBirdMetadata();
  replaceMlCatalogNumbers();
  sortObservations();
  writeJSONToFile(ebirdOutputFile, Object.values(dataDict));
  createSummaryData();
};

main();
