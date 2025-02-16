const municipality = new URLSearchParams(window.location.search).get("areaCode");

        const fetchData = async(municipality, birthDeath) => {
            try {
                const response = await fetch("https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "query": [{
                            "code": "Vuosi",
                            "selection": {
                                "filter": "item",
                                "values": ["2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021"]
                            }
                        }, {
                            "code": "Alue",
                            "selection": {
                                "filter": "item",
                                "values": [municipality]
                            }
                        }, {
                            "code": "Tiedot",
                            "selection": {
                                "filter": "item",
                                "values": [birthDeath]
                            }
                        }],
                        "response": {
                            "format": "json-stat2"
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Error in fetchData:', error);
                throw error;
            }
        };

        async function renderChart(municipality) {
            const years = ["2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021"];

            try {
                const births = await fetchData(municipality, "vm01");
                const deaths = await fetchData(municipality, "vm11");

                const extractValues = (data) => {
                    if (!data || !data.value) return new Array(years.length).fill(0);
                    return data.value;
                };

                const birthValues = extractValues(births);
                const deathValues = extractValues(deaths);

                const chart = new frappe.Chart("#chart", {
                    title: "Births and Deaths",
                    data: {
                        labels: years,
                        datasets: [{
                            name: "Births",
                            type: "line",
                            values: birthValues
                        }, {
                            name: "Deaths",
                            type: "line",
                            values: deathValues
                        }]
                    },
                    height: 450,
                    type: 'bar',
                    colors: ['#63d0ff', '#363636'],
                });
            } catch (error) {
                console.error('Error rendering chart:', error);
            }
        }

        renderChart(municipality);