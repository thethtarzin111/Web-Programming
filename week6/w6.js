let municipality = "SSS"; // Default code for the whole country
let municipalityNames = [];
let municipalityCodes = [];    
    
    
    //This const reqBody was referenced from chatgpt for the top 3-4 lines to understand how it works.
    //The rest I tried writing them myself.

    const reqBody = {
        "query": [
            {
                "code": "Vuosi",  // Year filter
                "selection": {
                    "filter": "item",
                    "values": [
                        "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007",
                        "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015",
                        "2016", "2017", "2018", "2019", "2020", "2021"
                    ]
                }
            },
            {
                "code": "Alue",  // Area filter
                "selection": {
                    "filter": "item",
                    "values": ["SSS"]  // SSS stands for the whole country
                }
            },
            {
                "code": "Tiedot",  // Data filter
                "selection": {
                    "filter": "item",
                    "values": ["vaesto"]  // "vaesto" refers to population data
                }
            }
        ],
        "response": {
            "format": "json"  // Expect the response in JSON format
        }
    };

    //This is the function to fetch the data when the page loads.

    const fetchData = async (municipalityCode) => {
        try {
            const response = await fetch('https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reqBody(municipalityCode)),
            });
    
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
    
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    };
    
    const fetchmunicipalityCodes = async () => {
        try {
            const response = await fetch("https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px");
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
    
            const data = await response.json();
            municipalityNames = data.variables[1].valueTexts;
            municipalityCodes = data.variables[1].values;
        } catch (error) {
            console.error('Error:', error);
        }
    };
    
    const renderChart = async (municipalityCode) => {
        const data = await fetchData(municipalityCode);
    
        if (!data) {
            return;
        }
    
        const years = ["2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021"];
        const population = data.value;
    
        const chart = new frappe.Chart("#chart", {
            title: "Population Growth",
            data: {
                labels: years,
                datasets: [{
                    name: "Population",
                    type: "line",
                    values: population
                }]
            },
            height: 450,
            type: 'line',
            colors: ['#eb5146']
        });
    
        document.getElementById("add-data").addEventListener("click", function() {
            addDataPrediction(chart);
        });
    };
    
    fetchmunicipalityCodes().then(() => {
        renderChart(municipality);
    });
    
    document.getElementById("submit-data").addEventListener("click", async function() {
        const userInput = document.getElementById("input-area").value.trim().toLowerCase();
        const areaIndex = municipalityNames.findIndex(name => name.toLowerCase() === userInput);
    
        if (areaIndex !== -1) {
            municipality = municipalityCodes[areaIndex];
            await renderChart(municipality);
        } else {
            alert("Invalid input");
        }
    });
    
    const addDataPrediction = (chart) => {
        const population = chart.data.datasets[0].values;
        const deltas = [];
    
        for (let i = 1; i < population.length; i++) {
            deltas.push(population[i] - population[i - 1]);
        }
    
        const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const nextDataPoint = population[population.length - 1] + meanDelta;
    
        chart.data.labels.push((parseInt(chart.data.labels.slice(-1)[0]) + 1).toString());
        chart.data.datasets[0].values.push(nextDataPoint);
    
        chart.update();
    };
    
    document.getElementById("navigation").addEventListener("click", function() {
        window.location.href = `newchart.html?areaCode=${municipality}`;
    });