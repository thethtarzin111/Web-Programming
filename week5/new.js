// Create a map instance and set its view with minZoom
var map = L.map('map', {
    minZoom: -3 // Set minimum zoom level
});

// Add OpenStreetMap background tiles with attribution
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Variables to hold migration data (by municipality codes)
var positiveMigrationData = {};
var negativeMigrationData = {};

// Fetch positive migration data
fetch('https://statfin.stat.fi/PxWeb/sq/4bb2c735-1dc3-4c5e-bde7-2165df85e65f')
    .then(response => response.json())
    .then(data => {
        // Extract municipality codes and positive migration values from the "Tuloalue" (area of arrival)
        const codes = data.dataset.dimension.Tuloalue.category.index;
        const values = data.dataset.value;

        Object.keys(codes).forEach((code, index) => {
            const municipalityCode = code.replace('KU', '');  // Remove "KU" prefix, leaving just the numeric part
            positiveMigrationData[municipalityCode] = values[index];  // Map code to positive migration value
        });
    })
    .catch(error => console.error('Error fetching positive migration data:', error));

// Fetch negative migration data
fetch('https://statfin.stat.fi/PxWeb/sq/944493ca-ea4d-4fd9-a75c-4975192f7b6e')
    .then(response => response.json())
    .then(data => {
        // Extract municipality codes and negative migration values from the "Lähtöalue" (area of departure)
        const codes = data.dataset.dimension.Lähtöalue.category.index;
        const values = data.dataset.value;

        Object.keys(codes).forEach((code, index) => {
            const municipalityCode = code.replace('KU', '');  // Remove "KU" prefix, leaving just the numeric part
            negativeMigrationData[municipalityCode] = values[index];  // Map code to negative migration value
        });
    })
    .catch(error => console.error('Error fetching negative migration data:', error));

// Function to determine the color based on migration data
function getColor(positive, negative) {
    // If negative migration is zero, set hue to maximum value (120)
    if (negative === 0) {
        return 'hsl(120, 75%, 50%)'; // Green for positive migration without negative
    }

    // Calculate the hue
    let hue = Math.pow((positive / negative), 3) * 60;

    // Cap hue at 120
    hue = Math.min(hue, 120); 

    return `hsl(${hue}, 75%, 50%)`; // Return HSL color
}

// Fetch the GeoJSON data from the provided URL
fetch('https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326')
    .then(response => response.json())
    .then(geojsonData => {
        // Add the GeoJSON data to the map with conditional styling
        var geojsonLayer = L.geoJSON(geojsonData, {
            style: function(feature) {
                const municipalityCode = feature.properties.kunta; // Get the kunta code
                const positiveMigration = positiveMigrationData[municipalityCode] || 0; // Get positive migration
                const negativeMigration = negativeMigrationData[municipalityCode] || 1; // Get negative migration (avoid division by zero)

                return {
                    color: getColor(positiveMigration, negativeMigration), // Set color based on migration data
                    weight: 2 // Set the weight of the boundary lines
                };
            },
            onEachFeature: function(feature, layer) {
                // Check if the feature has a name property and kunta property
                if (feature.properties && feature.properties.name && feature.properties.kunta) {
                    // Bind a tooltip that shows the municipality name on hover
                    layer.bindTooltip(feature.properties.name, {
                        permanent: false, // Tooltip shows only on hover
                        direction: 'auto'
                    });

                    // Add a click event to show the popup with migration data
                    layer.on('click', function() {
                        // Get the municipality code
                        var municipalityCode = feature.properties.kunta; // Get the kunta code (e.g., "005")

                        // Retrieve positive and negative migration values, if they exist
                        var positiveMigration = positiveMigrationData[municipalityCode] || "No data";
                        var negativeMigration = negativeMigrationData[municipalityCode] || "No data";

                        // Create the popup content
                        var popupContent = `
                            <strong>${feature.properties.name}</strong><br>
                            Positive migration: ${positiveMigration}<br>
                            Negative migration: ${negativeMigration}
                        `;

                        // Bind the popup to the layer and open it
                        layer.bindPopup(popupContent).openPopup();
                    });
                }
            }
        }).addTo(map);

        // Fit the map view to the bounds of the GeoJSON layer
        map.fitBounds(geojsonLayer.getBounds());
    })
    .catch(error => console.error('Error fetching GeoJSON data:', error));
