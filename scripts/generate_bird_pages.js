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

// Read the JSON file
const ebirdData = JSON.parse(fs.readFileSync("ebirdData.json", "utf8"));

// Ensure the output directory exists
const outputDir = path.join(__dirname, "../docs/birds");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate markdown files for each bird

const species = Object.values(ebirdData)
  .filter(({ category }) => category === "species")
  .sort((a, b) => a.primaryComName.localeCompare(b.primaryComName));

species.forEach((bird, index) => {
  const { primaryComName, sciName, order, family, speciesGroup, speciesCode } =
    bird;

  const photos = bird.observations
    .flatMap((obs) => obs.mlCatalogNumbers)
    .filter((obj) => obj !== undefined && obj.format === "Photo");

  const photoEmbeds = photos
    .sort((a, b) => b.averageCommunityRating - a.averageCommunityRating)
    .map(
      ({ MlCatalogNumber }) =>
        `<iframe src="https://macaulaylibrary.org/asset/${MlCatalogNumber}/embed" width="550" height="510" frameborder="0" allowfullscreen></iframe>`
    )
    .join("\n");

  const audios = bird.observations
    .sort((a, b) => b.averageCommunityRating - a.averageCommunityRating)
    .flatMap((obs) => obs.mlCatalogNumbers)
    .filter((obj) => obj !== undefined && obj.format === "Audio");

  const audioEmbeds = audios
    .map(
      ({ MlCatalogNumber }) =>
        `<iframe src="https://macaulaylibrary.org/asset/${MlCatalogNumber}/embed" width="360" height="480" frameborder="0" allowfullscreen></iframe>`
    )
    .join("\n");

  const markdownContent = `---
title: "${primaryComName}"
scientific_name: "${sciName}"
order: "${order}"
family: "${family}"
species_group: "${speciesGroup}"
species_code: "${speciesCode}"
sidebar_position: ${index + 1}
sidebar_class_name: "${photos.length > 0 ? "has-photo" : ""} ${
    audios.length > 0 ? "has-audio" : ""
  }"
tags: 
  ${order ? "- " + order : ""}
  ${family ? "- " + family : ""}
  ${speciesGroup ? "- " + speciesGroup.replace(":", " -") : ""}
  - ${photos.length > 0 ? "Has Photo" : "Needs Photo"}
  - ${audios.length > 0 ? "Has Audio" : "Needs Audio"}
---

# ${primaryComName} (${sciName})

**Order:** [${order}](/tags/${generateSlug(order)})

**Family:** [${family}](/tags/${generateSlug(family)})

**Species Group:** [${speciesGroup}](/tags/${generateSlug(speciesGroup)})

**My Sightings:** [eBird](https://ebird.org/lifelist?r=world&time=life&spp=${speciesCode}) | [Map](/map?species_code=${speciesCode})

**Photo**: ${photos.length > 0 ? "Yes" : "No"} 

**Audio**: ${audios.length > 0 ? "Yes" : "No"}

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

  const filePath = path.join(
    outputDir,
    `${speciesCode.toLowerCase().replace(/ /g, "-")}.md`
  );
  fs.writeFileSync(filePath, markdownContent, "utf8");
});

console.log("Markdown files generated successfully.");

// Generate an index file with a list of all birds
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
fs.writeFileSync(indexPath, indexContent, "utf8");

console.log("Index file generated successfully.");
