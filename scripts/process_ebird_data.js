const fs = require("fs");
const csv = require("csv-parser");

const ebirdInputFile = "c:/Users/rduen/my-website/scripts/MyEBirdData.csv";
const taxonomyFile =
  "c:/Users/rduen/my-website/scripts/eBird_taxonomy_v2024.csv";
const ebirdOutputFile = "c:/Users/rduen/my-website/scripts/ebirdData.json";
const countrySummaryOutputFile =
  "c:/Users/rduen/my-website/scripts/country_summary.json";
const countrySpeciesOutputFile =
  "c:/Users/rduen/my-website/scripts/country_for_species.json";

const dataDict = {};
const speciesCodeMap = {};
const countrySpeciesCount = {};
const speciesCountryCount = {};

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

// Read the taxonomy file and create a mapping from scientific name to species code
fs.createReadStream(taxonomyFile)
  .pipe(csv())
  .on("data", (row) => {
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
  })
  .on("end", () => {
    // Read the eBird data file and process it
    fs.createReadStream(ebirdInputFile)
      .pipe(csv())
      .on("data", (row) => {
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
          speciesCountryCount[speciesCode][country] = 0;
        }
        speciesCountryCount[speciesCode][country] += 1;
      })
      .on("end", () => {
        // Remove entries without observations
        for (const key in dataDict) {
          if (dataDict[key].observations.length === 0) {
            delete dataDict[key];
          }
        }

        // Convert "mlCatalogNumber" field to an array
        for (const key in dataDict) {
          dataDict[key].observations.forEach((observation) => {
            if (observation.mlCatalogNumbers) {
              observation.mlCatalogNumbers =
                observation.mlCatalogNumbers.split(" ");
            }
          });
        }

        // Sort each array by the new DateTime field
        for (const key in dataDict) {
          dataDict[key].observations.sort((a, b) => {
            return new Date(a["dateTime"]) - new Date(b["dateTime"]);
          });
        }

        const jsonData = JSON.stringify(dataDict, null, 4);
        fs.writeFileSync(ebirdOutputFile, jsonData, "utf-8");
        console.log(`JSON data has been written to ${ebirdOutputFile}`);

        // Create summary data
        const summary = {};
        for (const country in countrySpeciesCount) {
          summary[country] = countrySpeciesCount[country].size;
        }

        fs.writeFileSync(
          countrySummaryOutputFile,
          JSON.stringify(summary, null, 2)
        );
        console.log(
          `Summary JSON file has been created at ${countrySummaryOutputFile}`
        );

        // Write country species count data
        fs.writeFileSync(
          countrySpeciesOutputFile,
          JSON.stringify(speciesCountryCount, null, 2)
        );
        console.log(
          `Country species count JSON file has been created at ${countrySpeciesOutputFile}`
        );
      });
  });
