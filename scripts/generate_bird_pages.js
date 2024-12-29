// @ts-check
const fs = require("fs");
const path = require("path");

const stateMap = require("./all-states.json");

function generateSlug(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .replace(/\:/g, " -");
}

function readEbirdData(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function generateSubspeciesSeen(observations) {
  const subspeciesDict = {};
  observations.forEach(({ speciesCode, commonName, speciesCategory }) => {
    if (speciesCategory === "issf") subspeciesDict[speciesCode] = commonName;
  });

  const subspecies = Object.values(subspeciesDict);

  if (subspecies.length === 0) return "";

  return `\n**Subspecies Seen**: ${subspecies
    .sort((a, b) => a.localeCompare(b))
    .join(", ")}\n`;
}

function generatePhotoEmbeds(photos) {
  return photos
    .sort((a, b) => b.averageCommunityRating - a.averageCommunityRating)
    .map(
      ({ MlCatalogNumber }) =>
        `<iframe src="https://macaulaylibrary.org/asset/${MlCatalogNumber}/embed" width="550" height="560" frameborder="0" allowfullscreen></iframe>`
    )
    .join("\n");
}

function generateAudioEmbeds(audios) {
  return audios
    .map(
      ({ MlCatalogNumber }) =>
        `<iframe src="https://macaulaylibrary.org/asset/${MlCatalogNumber}/embed" width="360" height="480" frameborder="0" allowfullscreen></iframe>`
    )
    .join("\n");
}

function generatePlacesSeen(observations) {
  const places = new Set();
  observations.forEach((obs) => {
    places.add(
      `* ${stateMap[obs["state/Province"]].name}, ${
        stateMap[obs["state/Province"]].countryName
      }`
    );
  });
  return [...places].sort((a, b) => a.localeCompare(b)).join("\n");
}

function generateSightings({
  observations,
  bestPhoto,
  bestRecording,
  photographed,
  recorded,
}) {
  if (observations.length === 1) {
    const date = new Date(observations[0].datetime);
    const formattedDate = `${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}-${date.getFullYear()}`;
    return `* [${formattedDate} - ${
      stateMap[observations[0]["state/Province"]].name
    }, ${
      stateMap[observations[0]["state/Province"]].countryName
    }](https://ebird.org/checklist/${
      observations[0].submissionId
    }) (Only Sighting${photographed === 1 ? " / Photo" : ""}${
      recorded === 1 ? " / Recording" : ""
    })`;
  }

  let firstPhotoObs = !!observations[0].photographed;
  let firstRecordingObs = !!observations[0].recorded;
  let bestPhotoObs = false;
  let bestRecordingObs = false;

  function formatSighting(observation, prefix) {
    return `${prefix} Sighting${
      observation.photographed
        ? photographed === 1
          ? " / Only Photo"
          : bestPhoto.ebirdChecklistId === observation.submissionId
          ? ` / ${prefix} and Best Photo`
          : prefix === "Last"
          ? ""
          : ` / ${prefix} Photo`
        : ""
    }${
      observation.recorded
        ? recorded === 1
          ? " / Only Recording"
          : bestRecording.ebirdChecklistId === observation.submissionId
          ? ` / ${prefix} and Best Recording`
          : prefix === "Last"
          ? ""
          : `/ ${prefix} Recording`
        : ""
    }`;
  }

  const sightings = [
    {
      ...observations[0],
      type: formatSighting(observations[0], "First"),
      priority: 0,
    },
    {
      ...observations[observations.length - 1],
      type: formatSighting(observations[observations.length - 1], "Last"),
      priority: 5,
    },
  ];

  observations.slice(1, observations.length - 1).forEach((obs) => {
    if (
      !firstPhotoObs &&
      obs.mlCatalogNumbers &&
      obs.mlCatalogNumbers.filter(({ format }) => format === "Photo").length > 0
    ) {
      firstPhotoObs = true;
      if (bestPhoto && bestPhoto.ebirdChecklistId === obs.submissionId) {
        bestPhotoObs = true;
        sightings.push({
          ...obs,
          type: photographed === 1 ? "Only Photo" : "First/Best Photo",
          priority: 1,
        });
      } else {
        sightings.push({ ...obs, type: "First Photo", priority: 1 });
      }
    }
    if (
      !firstRecordingObs &&
      obs.mlCatalogNumbers &&
      obs.mlCatalogNumbers.filter(({ format }) => format === "Audio").length > 0
    ) {
      firstRecordingObs = true;
      if (
        bestRecording &&
        bestRecording.ebirdChecklistId === obs.submissionId
      ) {
        bestRecordingObs = true;
        sightings.push({
          ...obs,
          type: recorded === 1 ? "Only Recording" : "First/Best Recording",
          priority: 3,
        });
      } else {
        sightings.push({ ...obs, type: "First Recording", priority: 3 });
      }
    }
    if (
      bestPhoto &&
      !bestPhotoObs &&
      obs.mlCatalogNumbers &&
      obs.mlCatalogNumbers.filter(
        ({ MlCatalogNumber }) => MlCatalogNumber === bestPhoto.MlCatalogNumber
      ).length > 0
    ) {
      sightings.push({ ...obs, type: "Best Photo", priority: 2 });
    }
    if (
      bestRecording &&
      !bestRecordingObs &&
      obs.mlCatalogNumbers &&
      obs.mlCatalogNumbers.filter(
        ({ MlCatalogNumber }) =>
          MlCatalogNumber === bestRecording.MlCatalogNumber
      ).length > 0
    ) {
      sightings.push({ ...obs, type: "Best Recording", priority: 4 });
    }
  });

  return sightings
    .sort((a, b) => {
      const dateA = new Date(a.datetime).toDateString();
      const dateB = new Date(b.datetime).toDateString();
      if (dateA === dateB) {
        return a.priority - b.priority;
      }
      return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
    })
    .map((obs) => {
      const date = new Date(obs.datetime);
      const formattedDate = `${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}-${date.getFullYear()}`;
      return `* [${formattedDate} - ${stateMap[obs["state/Province"]].name}, ${
        stateMap[obs["state/Province"]].countryName
      }](https://ebird.org/checklist/${obs.submissionId}) (${obs.type})`;
    })
    .join("\n");
}

function generateMarkdownContent(bird, index, photoEmbeds, audioEmbeds) {
  const {
    primaryComName,
    sciName,
    order,
    family,
    speciesGroup,
    speciesCode,
    metadata: { description, wikipediaUrl },
  } = bird;
  return `---
title: "${primaryComName}"
scientific_name: "${sciName}"
order: "${order}"
family: "${family}"
species_group: "${speciesGroup}"
species_code: "${speciesCode}"
sidebar_position: ${index + 1}
sidebar_class_name: "${photoEmbeds.length > 0 ? "has-photo" : ""} ${
    audioEmbeds.length > 0 ? "has-audio" : ""
  }"
tags: 
  ${order ? "- " + order : ""}
  ${family ? "- " + family : ""}
  ${speciesGroup ? "- " + speciesGroup.replace(":", " -") : ""}
  - ${photoEmbeds.length > 0 ? "Has Photo" : "Needs Photo"}
  - ${audioEmbeds.length > 0 ? "Has Audio" : "Needs Audio"}
---

# ${primaryComName} <span className='sci_name'>${sciName}</span>

## Overview

${
  description
    ? `### Description
${description}[^1]

[^1]: ${wikipediaUrl}`
    : ""
}

### Taxonomy
[${order}](/tags/${generateSlug(order)}) > [${family}](/tags/${generateSlug(
    family
  )}) > [${speciesGroup}](/tags/${generateSlug(speciesGroup)})
${generateSubspeciesSeen(bird.observations)}

## Sightings

**My Sightings:** [eBird](https://ebird.org/lifelist?r=world&time=life&spp=${speciesCode}) | [Map](/map?species_code=${speciesCode})

### Relevant Sightings

${generateSightings(bird)}

### Places Seen

${generatePlacesSeen(bird.observations)}



## Media
### Photographs
${photoEmbeds.length > 0 ? photoEmbeds : "No photographs available."}

### Audio Recordings
${audioEmbeds.length > 0 ? audioEmbeds : "No audio recordings available."}

## Links
* [eBird](https://ebird.org/species/${speciesCode}) 
* [All About Birds](https://www.allaboutbirds.org/guide/${speciesCode
    .toLowerCase()
    .replace(/ /g, "-")}) 
* [Xeno-canto](https://www.xeno-canto.org/species/${sciName
    .toLowerCase()
    .replace(/\s+/g, "-")}) 
* [Macaulay Library](https://search.macaulaylibrary.org/catalog?taxonCode=${speciesCode}&sort=rating_rank_desc)
* [Birds of the World](https://birdsoftheworld.org/bow/species/${speciesCode})
`;
}

function writeMarkdownFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function generateBirdPages(species, outputDir) {
  species.forEach((bird, index) => {
    const photos = bird.observations
      .flatMap((obs) => obs.mlCatalogNumbers)
      .filter((obj) => obj !== undefined && obj.format === "Photo");

    const audios = bird.observations
      .sort((a, b) => b.averageCommunityRating - a.averageCommunityRating)
      .flatMap((obs) => obs.mlCatalogNumbers)
      .filter((obj) => obj !== undefined && obj.format === "Audio");

    const photoEmbeds = generatePhotoEmbeds(photos);
    const audioEmbeds = generateAudioEmbeds(audios);
    const markdownContent = generateMarkdownContent(
      bird,
      index,
      photoEmbeds,
      audioEmbeds
    );

    const filePath = path.join(
      outputDir,
      `${bird.speciesCode.toLowerCase().replace(/ /g, "-")}.md`
    );
    writeMarkdownFile(filePath, markdownContent);
  });
}

function generateIndexFile(species, outputDir) {
  const birdsByYear = species.reduce((acc, bird) => {
    const year = new Date(bird.observations[0].datetime).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(bird);
    return acc;
  }, {});

  const indexHeader = `---
id: Birds
title: Life List
slug: /
---

import BirdCard from '@site/src/components/BirdCard';

# Life List

`;

  const yearContent = [];

  let birdCount = 0;

  let currentTripReport;

  for (const year of Object.keys(birdsByYear).sort(
    (a, b) => parseInt(b) - parseInt(a)
  )) {
    let cardCount = 0;
    yearContent.push(`## ${year}
    <div className="container">
      <div className="row">

${birdsByYear[year]
  .map((bird, index, birds) => {
    const {
      primaryComName,
      speciesCode,
      bestPhoto,
      bestRecording,
      observations,
    } = birds[birds.length - 1 - index];

    const obsTripReport =
      observations[0].tripReport && observations[0].tripReport;

    let html = "";

    if (
      (currentTripReport && currentTripReport.id) !==
      (observations[0].tripReport && observations[0].tripReport.id)
    ) {
      cardCount = 0;
      currentTripReport = obsTripReport;
      if (currentTripReport)
        html = `\n
      </div></div>
      ### ${currentTripReport.title}
      <div className="container tripReport">
       :::tip[Trip Report Summary]

* Regions Visited: ${currentTripReport.regions
          .map((region) => `[${region}](https://ebird.org/region/${region})`)
          .join(", ")}
* Dates: ${currentTripReport.startDate} - ${currentTripReport.endDate}

See details at [eBird](${currentTripReport.url}) 

:::

      <div className="row">`;
      else
        html = `\n
        </div></div>
        <div className="container ">
        <div className="row">`;
    }

    return `${html}\n
    <BirdCard
      index="${species.length - birdCount++}"
      name="${primaryComName}"
      speciesCode="${speciesCode}"
      ${bestPhoto ? `photo="${bestPhoto.MlCatalogNumber}"` : ""} 
      ${
        bestRecording ? `recording="${bestRecording.MlCatalogNumber}"` : ""
      }/>\n${
      cardCount++ % 3 === 2
        ? `</div>
    <div className="row">`
        : ""
    }`;
  })
  .join("\n")}
  </div></div>`);
  }

  const indexPath = path.join(outputDir, "index.md");
  writeMarkdownFile(indexPath, indexHeader + yearContent.join("\n"));
}

function main() {
  const ebirdData = readEbirdData("ebirdData.json");
  const outputDir = path.join(__dirname, "../docs/birds");
  ensureDirectoryExists(outputDir);
  generateBirdPages(
    Object.values(ebirdData).sort((a, b) =>
      a.primaryComName.localeCompare(b.primaryComName)
    ),
    outputDir
  );
  generateIndexFile(
    Object.values(ebirdData).sort(
      (a, b) =>
        new Date(a.observations[0].datetime).getTime() -
        new Date(b.observations[0].datetime).getTime()
    ),
    outputDir
  );
  console.log("Markdown files and index generated successfully.");
}

main();
