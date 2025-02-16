if (document.readyState!= 'loading') {
    console.log("Document is ready!");
    initializeCode();
} else{
    document.addEventListener("DOMContentLoaded", function() {
        console.log("Document loaded after waiting!");
        initializeCode();
    });
}

async function initializeCode() {
    
    const showContainer = document.querySelector(".show-container");
    const button = document.getElementById('submit-data');

    
    button.addEventListener('click', async function(event) {

        event.preventDefault();
        const query = document.querySelector('#input-show').value.trim();
        if(!query) {
            alert("Please enter the name of the show.");
            return;
        }
        const url = `https://api.tvmaze.com/search/shows?q=${query}`;

        const promise = await fetch(url);
        const shows = await promise.json();
        showContainer.innerHTML = '';

        for (let i =0; i<shows.length; i++) {
            const show = shows[i].show;
            const showDataDiv = document.createElement('div');
            showDataDiv.classList.add('show-data');

            const imgElement = document.createElement('img');
            imgElement.src = show.image ? show.image.medium : 'https://via.placeholder.com/210x295?text=No+Image';

            //This is a div for show info.
            const showInfoDiv = document.createElement('div');
            showInfoDiv.classList.add('show-info');

            //Here, we create h1 element for the show title.
            const titleElement = document.createElement('h1');
            titleElement.textContent = show.name;

            //This is for summary.
            const summaryElement = document.createElement('div');
            summaryElement.innerHTML = show.summary || '<p>No summary available.</p>';

            //Here, we add information to show info div.
            showInfoDiv.appendChild(titleElement);
            showInfoDiv.appendChild(summaryElement);

            //This is to add image and show info.
            showDataDiv.appendChild(imgElement);
            showDataDiv.appendChild(showInfoDiv);

            showContainer.appendChild(showDataDiv);

        }
    });

        

}