const fs = require("fs");
const path = require("path");

// Read the JSON file
const ebirdData = JSON.parse(fs.readFileSync("ebirdData.json", "utf8"));

// Ensure the output directory exists
const outputDir = path.join(__dirname, "../src/pages/birds");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate markdown files for each bird
Object.values(ebirdData).forEach((bird) => {
  const { primaryComName, sciName, order, family, speciesGroup, speciesCode } =
    bird;
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
