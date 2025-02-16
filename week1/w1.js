if(document.readyState !== "loading") {
    console.log("Ready!");
    initializeCode();
} else {
    document.addEventListener("DOMContentLoaded", function() {
        console.log("After waiting, it's ready!");
        initializeCode();
    })
}

function initializeCode() {
    
    const button = document.getElementById('my-button');
    button.addEventListener('click', function() {
        console.log("hello world");

        const heading = document.querySelector('h1');
        heading.textContent = "Moi maailma";
    });

    const textarea = document.getElementById('input-text');
    const addButton = document.getElementById('add-data');
    const list = document.getElementById('my-list');

    addButton.addEventListener('click',function() {
        const text = textarea.value.trim(); //Reference from chatgpt
        const newElement = document.createElement('li');
        newElement.textContent = text;
        list.appendChild(newElement);

        textarea.value = '';
    })
    }