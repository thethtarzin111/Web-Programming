if (document.readyState !== "loading") {
    console.log("Ready!");
    initializeCode();
} else {
    document.addEventListener("DOMContentLoaded", function () {
        console.log("After waiting, it's ready!");
        initializeCode();
    });
}

async function initializeCode() {
    const map = L.map('map', { minZoom: -3 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let positiveMigrationData = {};
    let negativeMigrationData = {};

    // Fetch positive and negative migration data in parallel
    try {
        const [positiveResponse, negativeResponse] = await Promise.all([
            fetch('https://statfin.stat.fi/PxWeb/sq/4bb2c735-1dc3-4c5e-bde7-2165df85e65f'),
            fetch('https://statfin.stat.fi/PxWeb/sq/944493ca-ea4d-4fd9-a75c-4975192f7b6e')
        ]);

        const positiveData = await positiveResponse.json();
        const negativeData = await negativeResponse.json();

        // Extracting positive migration data
        const positiveCodes = positiveData.dataset.dimension.Tuloalue.category.index;
        const positiveValues = positiveData.dataset.value;
        Object.keys(positiveCodes).forEach((code, index) => {
            const municipalityCode = code.replace('KU', '');
            positiveMigrationData[municipalityCode] = positiveValues[index];
        });

        // Extracting negative migration data
        const negativeCodes = negativeData.dataset.dimension.Lähtöalue.category.index;
        const negativeValues = negativeData.dataset.value;
        Object.keys(negativeCodes).forEach((code, index) => {
            const municipalityCode = code.replace('KU', '');
            negativeMigrationData[municipalityCode] = negativeValues[index];
        });

        // Fetch and display GeoJSON data after migration data is ready
        const geojsonResponse = await fetch('https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326');
        const geojsonData = await geojsonResponse.json();

        var geoJsonLayer = L.geoJSON(geojsonData, {
            style: function (feature) {
                const municipalityCode = feature.properties.kunta;
                const positiveMigration = positiveMigrationData[municipalityCode] || 0;
                const negativeMigration = negativeMigrationData[municipalityCode] || 1; // Prevent division by zero
                return {
                    color: getColor(positiveMigration, negativeMigration),
                    weight: 2
                };
            },
            onEachFeature: function (feature, layer) {
                const municipalityName = feature.properties.name;
                const municipalityCode = feature.properties.kunta;
                const positiveMigration = positiveMigrationData[municipalityCode] || 0;
                const negativeMigration = negativeMigrationData[municipalityCode] || 0;

                if (municipalityName) {
                    layer.bindTooltip(municipalityName, {
                        permanent: false,
                        direction: 'top'
                    });

                    layer.on({
                        mouseover: (e) => e.target.setStyle(hoverStyle),
                        mouseout: (e) => e.target.setStyle(defaultStyle),
                        click: (e) => {
                            layer.bindPopup(`
                                <b>${municipalityName}</b><br>
                                Positive Migration: ${positiveMigration}<br>
                                Negative Migration: ${negativeMigration}
                            `).openPopup();
                        }
                    });
                }
            }
        }).addTo(map);

        // Adjust map bounds based on the geoJsonLayer
        map.fitBounds(geoJsonLayer.getBounds());

    } catch (error) {
        console.error('Error fetching migration or GeoJSON data:', error);
    }
}

const defaultStyle = {
    weight: 2,
    color: '#3388ff',  // Default blue color
    fillOpacity: 0.2
};

// Hover style for highlighting
const hoverStyle = {
    weight: 3,
    color: '#000080',
    fillOpacity: 0.3
};

function getColor(positive, negative) {
    if (negative == 0) {
        return 'hsl(120, 75%, 50%)';  // Green color if no negative migration
    }

    const hue = Math.min(((positive / negative) ** 3) * 60, 120);
    return `hsl(${hue}, 75%, 50%)`;  // Color transitions from red to green
}
