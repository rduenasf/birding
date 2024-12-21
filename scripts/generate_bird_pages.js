const fs = require("fs");
const path = require("path");

// Read the JSON file
const ebirdData = JSON.parse(fs.readFileSync("ebirdData.json", "utf8"));

// Ensure the output directory exists
const outputDir = path.join(__dirname, "../docs/birds");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate markdown files for each bird
Object.values(ebirdData).forEach((bird) => {
  const { primaryComName, sciName, order, family, speciesGroup, speciesCode } =
    bird;
  const photoEmbeds = bird.observations
    .flatMap((obs) => obs.mlCatalogNumbers)
    .filter((obj) => obj !== undefined && obj.format === "Photo")
    .map(
      ({ MlCatalogNumber }) =>
        `<iframe src="https://macaulaylibrary.org/asset/${MlCatalogNumber}/embed" width="550" height="510" frameborder="0" allowfullscreen></iframe>`
    )
    .join("\n");

  const audioEmbeds = bird.observations
    .flatMap((obs) => obs.mlCatalogNumbers)
    .filter((obj) => obj !== undefined && obj.format === "Audio")
    .map(
      ({ MlCatalogNumber }) =>
        `<iframe src="https://macaulaylibrary.org/asset/${MlCatalogNumber}/embed" width="550" height="510" frameborder="0" allowfullscreen></iframe>`
    )
    .join("\n");

  const markdownContent = `---
title: "${primaryComName}"
scientific_name: "${sciName}"
order: "${order}"
family: "${family}"
species_group: "${speciesGroup}"
species_code: "${speciesCode}"
---

# ${primaryComName}

**Scientific Name:** ${sciName}

**Order:** ${order}

**Family:** ${family}

**Species Group:** ${speciesGroup}

**Species Code:** ${speciesCode}

**My Sightings:** [eBird](https://ebird.org/lifelist?r=world&time=life&spp=${speciesCode})

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

## Media
### Photographs
${photoEmbeds.length > 0 ? photoEmbeds : "No photographs available."}

### Audio Recordings
${audioEmbeds.length > 0 ? audioEmbeds : "No audio recordings available."}
`;

  const filePath = path.join(
    outputDir,
    `${speciesCode.toLowerCase().replace(/ /g, "-")}.md`
  );
  fs.writeFileSync(filePath, markdownContent, "utf8");
});

console.log("Markdown files generated successfully.");

// Generate an index file with a list of all birds
const indexContent = Object.values(ebirdData)
  .sort((a, b) => a.primaryComName.localeCompare(b.primaryComName))
  .map((bird) => {
    const { primaryComName, speciesCode } = bird;
    return `1. [${primaryComName}](./birds/${speciesCode
      .toLowerCase()
      .replace(/ /g, "-")})`;
  })
  .join("\n");

const indexPath = path.join(outputDir, "index.md");
fs.writeFileSync(indexPath, indexContent, "utf8");

console.log("Index file generated successfully.");
