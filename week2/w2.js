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
    const username = document.getElementById('input-username');
    const email = document.getElementById('input-email');
    const admin = document.getElementById('input-admin');
    const button = document.getElementById('submit-data');
    const imageInput = document.getElementById('input-image');
    const emptyButton = document.getElementById('empty-table');
    const table = document.getElementById('t1');
    const tableBody = document.querySelector('#t1 tbody');

    button.addEventListener('click', function(event) {
    
    if (username.value ==="" || email.value ==="") {
        alert("Please insert data!");
        return;
    }
    const usernameData = username.value;
    const emailData = email.value;
    const adminData = admin.checked? "x":"-";

    //Reference from chatgpt for this function
    let userRow = null;
        for (let row of tableBody.rows) {
            const cell = row.cells[0]; // Username cell
            if (cell.innerText === usernameData) {
                userRow = row;
                break;
            }
        }

        if (userRow) {
            // Update existing row
            userRow.cells[1].innerText = emailData;
            userRow.cells[2].innerText = adminData;
        } else {
    //Here, we need to create a new row to insert new data.
    const newRow = document.createElement('tr');
    
    //Here, we create new columns.
    const usernameCol = document.createElement('td');
    const emailCol = document.createElement('td');
    const adminCol = document.createElement('td');
    const pictureCol = document.createElement('td');

    usernameCol.innerHTML = usernameData;
    emailCol.innerHTML = emailData;
    adminCol.innerHTML = adminData;
    

    //This is to create the ratio of the picture. Used ChatGPT to get some idea how to fix the image size.
    const picture = document.createElement('img');
    picture.width = 64;
    picture.height = 64;
    
    if (imageInput.files.length > 0) {
        picture.src = URL.createObjectURL(imageInput.files[0]);
    } else {
        picture.src = 'Herbee-1-ht-er-191022_hpMain_1x1_992.jpg'; // Set a default image if none is provided
    }
    pictureCol.appendChild(picture);

    newRow.appendChild(usernameCol);
    newRow.appendChild(emailCol);
    newRow.appendChild(adminCol);
    newRow.appendChild(pictureCol);

    tableBody.appendChild(newRow);

    }

    username.value="";
    email.value="";
    admin.checked=false;

    console.log("Form submitted!");
    event.preventDefault();
    });

    //Reference from: https://www.daniweb.com/programming/web-development/threads/113340/delete-all-rows-from-table-in-javascript
    emptyButton.addEventListener('click', function() {
        
        for(var i = table.rows.length - 1; i > 0; i--)
            {
                table.deleteRow(i);
            }
    });

}