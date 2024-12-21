import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";

import countryData from "@site/static/country_summary.json";
import countrySpeciesData from "@site/static/country_for_species.json";

const getColor = (d) => {
  return d > 300
    ? "#800026"
    : d > 200
    ? "#BD0026"
    : d > 100
    ? "#E31A1C"
    : d > 50
    ? "#FC4E2A"
    : d > 20
    ? "#FD8D3C"
    : d > 10
    ? "#FEB24C"
    : d > 5
    ? "#FED976"
    : "#DDDDDD";
};

const style = (feature, data) => {
  const speciesCount = data[feature.properties.ISO_A2] || 0;
  return {
    fillColor: getColor(speciesCount),
    weight: 2,
    opacity: 1,
    color: "white",
    dashArray: "3",
    fillOpacity: 0.7,
  };
};

const onEachFeature = (feature, layer, data) => {
  if (feature.properties && feature.properties.NAME) {
    const countryName = feature.properties.NAME;
    const speciesCount = data[feature.properties.ISO_A2] || 0;
    layer.bindTooltip(`${countryName}: ${speciesCount}`);
    layer.on("click", function () {
      console.log(feature.properties);
    });
  }
};

const Map = () => {
  const geojsonUrl = useBaseUrl("ne_50m_admin_0_map_units.geojson");

  const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  };

  useEffect(() => {
    const speciesCode = getQueryParam("species_code");
    const countData = speciesCode
      ? countrySpeciesData[speciesCode]
      : countryData;

    const map = L.map("map", {
      preferCanvas: true,
      zoomControl: false,
      attributionControl: false,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      maxBoundsViscosity: 1.0,
      minZoom: 2,
    }).setView([0, 0], 2);

    fetch(geojsonUrl)
      .then((response) => response.json())
      .then((data) => {
        const filteredData = {
          ...data,
          features: data.features.filter(
            (feature) => feature.properties.ISO_A2 !== "AQ"
          ),
        };
        L.geoJSON(filteredData, {
          style: (feature) => style(feature, countData),
          onEachFeature: (feature, layer) =>
            onEachFeature(feature, layer, countData),
        }).addTo(map);
      })
      .catch((error) => console.error("Error fetching GeoJSON:", error));
  }, [geojsonUrl]);

  return (
    <Layout>
      <div
        id="map"
        style={{ height: "100vh", width: "100%", background: "transparent" }}
      ></div>
    </Layout>
  );
};

export default Map;
