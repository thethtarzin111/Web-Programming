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
    const tableBody = document.querySelector("#populationTable tbody");
    const populationurl = "https://statfin.stat.fi/PxWeb/sq/4e244893-7761-4c4f-8e55-7a8d41d86eff"
    const employmentURL = "https://statfin.stat.fi/PxWeb/sq/5e288b40-f8c8-4f1e-b3b0-61b86ce5c065";
    
    const muniPromise = await fetch(populationurl)
    const muniJSON = await muniPromise.json()

    const employmentPromise = await fetch(employmentURL)
    const employmentJSON = await employmentPromise.json()

    const municipalities = muniJSON.dataset.dimension.Alue.category.label;
    const populations = muniJSON.dataset.value;
    const employmentData = employmentJSON.dataset.value;

    let index = 0;
    for (const key in municipalities) {
        let tr = document.createElement("tr")
        let td1 = document.createElement("td") //This is for municipality.
        let td2 = document.createElement("td") //This is for population.
        let td3 = document.createElement("td") //This is for employment.
        let td4 = document.createElement("td") //This is for employment percentage.

        td1.innerText = municipalities[key];
        const population = parseInt(populations[index]);  // Ensure it's an integer
        td2.innerText = population;
        const employment = parseInt(employmentData[index]);
        td3.innerText = employment;

         // This is the formula to calculate the employment percentage
         let employmentPercentage = 0;
        if (population > 0) { // To avoid division by zero
            employmentPercentage = (employment / population) * 100;
        }
        const employmentPercentageRounded = parseFloat(employmentPercentage.toFixed(2)); // Convert to number and round to 2 decimals
        
        td4.innerText = employmentPercentageRounded + "%"; // Add "%" symbol
        
        // Apply background color based on employment percentage
        if (employmentPercentageRounded > 45) {
            tr.style.backgroundColor = "#abffbd"; // Green for over 45%
        } else if (employmentPercentageRounded < 25) {
            tr.style.backgroundColor = "#ff9e9e"; // Red for under 25%
        }
        index++;

        tr.appendChild(td1)
        tr.appendChild(td2)
        tr.appendChild(td3)
        tr.appendChild(td4)
        tableBody.appendChild(tr)
    }

}