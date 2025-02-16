if(document.readyState !== "loading") {
    console.log("Ready!");
    initializeCode();
} else {
    document.addEventListener("DOMContentLoaded", function() {
        console.log("After waiting, it's ready!");
        initializeCode();
    })
}


async function initializeCode() {
    const map = L.map('map', {
        minZoom: -3
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const url = 'https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326';
const postMigURL = 'https://statfin.stat.fi/PxWeb/sq/4bb2c735-1dc3-4c5e-bde7-2165df85e65f';
const negMigURL = 'https://statfin.stat.fi/PxWeb/sq/944493ca-ea4d-4fd9-a75c-4975192f7b6e';

async function fetchMigrationData() {
    const [positiveResponse, negativeResponse] = await Promise.all([
        fetch(postMigURL),
        fetch(negMigURL)
    ]);

    const positiveData = await positiveResponse.json();
    const negativeData = await negativeResponse.json();
    
    return {
        positive: positiveData.dataset.value,
        negative: negativeData.dataset.value
    };
}
const promise = await fetch(url);

console.log('GeoJSON Data:', promise);

const data = await promise.json();
const migrationData = await fetchMigrationData();


const defaultStyle = {
    weight: 2,
    color: '#3388ff',  // Default blue color
    fillOpacity: 0.2
};

// Hover style for highlighting
const hoverStyle = {
    weight: 3,
    color: `#000080`,
    fillOpacity: 0.3
};

function getColor(positive, negative) {
    if (negative == 0) {
        return 'hsl(120, 75%, 50%)';
    }

    const hue = Math.min(((positive / negative) ** 3) * 60, 120);
    return `hsl(${hue}, 75%, 50%)`;
}
const geoJsonLayer = L.geoJSON(data, {
    style: (feature) => {
        const municipalityCode = feature.properties.kunta;
        const positiveMigration = migrationData.positive[municipalityCode] || 0;
        const negativeMigration = migrationData.negative[municipalityCode] || 0;

        return {
            weight: 2,
            color: getColor(positiveMigration, negativeMigration),
            fillOpacity: 0.5
        };
    },
    onEachFeature: (feature, layer) => {
        const municipalityName = feature.properties.name;
        const municipalityCode = feature.properties.kunta;
        console.log(`Municipality Code: ${municipalityCode}`);

        const positiveMigration = migrationData?.positive[municipalityCode] || 'No data';
        const negativeMigration = migrationData?.negative[municipalityCode] || 'No data';
        
        if(municipalityName) {
            layer.bindTooltip(municipalityName, {
                permanent: false,
                direction: 'top'
            });

            layer.on({
                mouseover: (e) => {
                    e.target.setStyle(hoverStyle);
                },
                mouseout: (e) => {
                    e.target.setStyle(defaultStyle)
                },
                click: (e) => {
                    console.log(`Municipality: ${municipalityName}, Code: ${municipalityCode}`);
    //console.log(`Positive: ${migrationData.positive[municipalityCode]}`);
    //console.log(`Negative: ${migrationData.negative[municipalityCode]}`);
    console.log('Migration Data:', migrationData);

    console.log(`Positive: ${migrationData.positive['KU020']}`); // Should output 820
console.log(`Negative: ${migrationData.negative['KU020']}`);
                    layer.bindPopup(`
                        <b>${municipalityName}</b><br>
                        Positive Migration: ${positiveMigration}<br>
                        Negative Migration: ${negativeMigration}`).openPopup();
                }
            });
        }
    }
}).addTo(map);

map.fitBounds(geoJsonLayer.getBounds());
}