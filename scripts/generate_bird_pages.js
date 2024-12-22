const fs = require("fs");
const path = require("path");

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

function getSpeciesData(ebirdData) {
  return Object.values(ebirdData)
    .filter(({ category }) => category === "species")
    .sort((a, b) => a.primaryComName.localeCompare(b.primaryComName));
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

# ${primaryComName} (${sciName})

**Order:** [${order}](/tags/${generateSlug(order)})

**Family:** [${family}](/tags/${generateSlug(family)})

**Species Group:** [${speciesGroup}](/tags/${generateSlug(speciesGroup)})

**My Sightings:** [eBird](https://ebird.org/lifelist?r=world&time=life&spp=${speciesCode}) | [Map](/map?species_code=${speciesCode})

**Photo**: ${photoEmbeds.length > 0 ? "Yes" : "No"} 

**Audio**: ${audioEmbeds.length > 0 ? "Yes" : "No"}

${
  description
    ? `## Description
${description}[^1]

[^1]: ${wikipediaUrl}`
    : ""
}

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

function generateBirdPages(ebirdData, outputDir) {
  const species = getSpeciesData(ebirdData);
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
  const indexContent = `---
id: Birds
slug: /
---

  ${species
    .map((bird) => {
      const { primaryComName, speciesCode, observations } = bird;

      const photographed =
        observations
          .flatMap((obs) => obs.mlCatalogNumbers)
          .filter((obj) => obj !== undefined && obj.format === "Photo").length >
        0;

      const recorded =
        observations
          .flatMap((obs) => obs.mlCatalogNumbers)
          .filter((obj) => obj !== undefined && obj.format === "Audio").length >
        0;

      return `1. [${primaryComName}${photographed ? " 📷" : ""} ${
        recorded ? " 🔊" : ""
      }](./birds/${speciesCode})`;
    })
    .join("\n")}
`;

  const indexPath = path.join(outputDir, "index.md");
  writeMarkdownFile(indexPath, indexContent);
}

function main() {
  const ebirdData = readEbirdData("ebirdData.json");
  const outputDir = path.join(__dirname, "../docs/birds");
  ensureDirectoryExists(outputDir);
  generateBirdPages(ebirdData, outputDir);
  generateIndexFile(getSpeciesData(ebirdData), outputDir);
  console.log("Markdown files and index generated successfully.");
}

main();
