import { csvParse } from './js/d3-dsv.module.js';

let stars = [];
let starsData = [];
let missingStars = [];
let missingStarCount = 0;
let limitingMagnitude = 0;
let isMarkingPosition = false;

const path = './data/StarCatalogue.csv';
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    missingStarCount = parseInt(params.get('missingStars'));
    limitingMagnitude = parseFloat(params.get('limitingMag'));
    await loadSky(missingStarCount, limitingMagnitude);
    updateStarList();
    plotSky(stars);

    const searchInput = document.getElementById('starSearch');
    const starListDiv = document.getElementById('starList');

    searchInput.addEventListener('focus', () => {
        starListDiv.innerHTML = '';
        updateStarList();
    });
    
    // Set up event listeners
    document.getElementById('exitButton').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    document.getElementById('searchButton').addEventListener('click', () => {
        const starName = document.getElementById('starSearch').value.trim();
        if (starName) {
            searchStarByName(starName);
        } else {
            alert("Please enter a star name.");
        }
    });

    document.getElementById('submitButton').addEventListener('click', submitSelectedStars);

    settingsButton.addEventListener('click', () => {
        settingsMenu.style.display = settingsMenu.style.display === 'none' ? 'block' : 'none';
        });

});

document.addEventListener('DOMContentLoaded', async () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    // Load previously saved mode or default to light mode
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        enableDarkMode();
        darkModeToggle.checked = true;
    } else {
        disableDarkMode();
    }

    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            enableDarkMode();
        } else {
            disableDarkMode();
        }
    });

});


async function loadSky(missingStarCount, limitingMagnitude) {
    try {
        const response = await fetch(path);
        const csvText = await response.text();
        starsData = csvParse(csvText); 

        const starEq = d3.csvParse(csvText).map(d => ({
            mag: +d.mag,
            ra: +d.ra,
            dec: +d.dec,
            name: d.name
        }));

        const lat = Math.random() * 180 - 90;
        const sid = Math.random() * 360;
        const off = Math.random() * 360;
        sList(lat, sid, off, starEq, missingStarCount, limitingMagnitude);

    } catch (error) {
        console.error("Error loading CSV file:", error);
    }
}

function deg2rad(deg) {
    return deg * Math.PI / 180;
}

function sList(lat, siderealTime, off, starEq, missingStarCount, limitingMagnitude) {
    let sd = deg2rad(siderealTime);

    let starsAboveHorizon = [];
    let starsAboveFiveDegrees = [];

    starEq.forEach(star => {
        let h = 15 * deg2rad(star.ra) - sd;
        let d = deg2rad(star.dec);
        let phi = deg2rad(lat);

        let sina = Math.cos(h) * Math.cos(d) * Math.cos(phi) + Math.sin(d) * Math.sin(phi);
        let altitude = Math.asin(sina) * (180 / Math.PI);

        if (sina < Math.sin(2 * Math.PI / 180)) {
            return;
        }

        if (star.mag > 6) {
            return;
        }

        starsAboveHorizon.push(star);

        if (altitude >= 5) {
            starsAboveFiveDegrees.push(star);
        }

    });

    const brightStarsToRemove = starsAboveFiveDegrees.filter(star => star.mag <= limitingMagnitude);

    for (let i = 0; i < missingStarCount && brightStarsToRemove.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * brightStarsToRemove.length);
        const removedStar = brightStarsToRemove.splice(randomIndex, 1)[0];
        missingStars.push(removedStar);
    }

    console.log("Removed stars:", missingStars);

    starsAboveHorizon.forEach(star => {
        if (!missingStars.includes(star)) {
            let h = 15 * deg2rad(star.ra) - sd;
            let d = deg2rad(star.dec);
            let phi = deg2rad(lat);
            const offset = deg2rad(off);

            let sina = Math.cos(h) * Math.cos(d) * Math.cos(phi) + Math.sin(d) * Math.sin(phi);
            let cosa = Math.sqrt(1 - sina * sina);
            let s1 = Math.sin(h) * Math.cos(d);
            let sinA = s1 / cosa;
            let s2 = Math.cos(h) * Math.cos(d) * Math.sin(phi) - Math.sin(d) * Math.cos(phi);
            let cosA = s2 / cosa;

            let tempSinA = sinA * Math.cos(offset) + cosA * Math.sin(offset);
            let tempCosA = cosA * Math.cos(offset) - sinA * Math.sin(offset);
            sinA = tempSinA;
            cosA = tempCosA;

            let r = 1 - (Math.asin(sina) * 2 / Math.PI);
            let x = r * sinA;
            let y = -r * cosA;

            stars.push({ x, y, mag: star.mag });
        }
    });
}


function plotSky(stars) {
    const canvas = document.getElementById("skyCanvas");
    const ctx = canvas.getContext("2d");

    const isDarkMode = document.body.classList.contains('dark-mode');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Set background color based on mode
    ctx.fillStyle = isDarkMode ? "black" : "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw circle for the sky view boundary
    const centerX = canvas.width * 0.3;
    const centerY = canvas.height * 50.2 / 100;
    const radius = Math.min(centerX, centerY, canvas.height - centerY) - 10;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = isDarkMode ? "white" : "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw the stars
    stars.forEach(star => {
        if (star.x) {
            const x = centerX + star.x * radius;
            const y = centerY + star.y * radius;
            const size = Math.min(8, 8 * Math.pow(10, -0.22 * star.mag));
            ctx.beginPath();
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.fillStyle = isDarkMode ? "white" : "black";
            ctx.fill();
        }
    });

    searchedStars.forEach(star => {
        if (star.circle) {
            drawCircleOnCanvas(star.circle.x, star.circle.y, star);
        }
    });

}

// Adjust the plot when the mode changes
function enableDarkMode() {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');
    document.getElementById('settingsMenu').style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    document.getElementById('searchContainer').style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    document.getElementById('starList').style.backgroundColor = '#333';
    plotSky(stars); // Re-plot stars in dark mode
}

function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'disabled');
    document.getElementById('settingsMenu').style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    document.getElementById('searchContainer').style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    document.getElementById('starList').style.backgroundColor = '#f9f9f9';
    plotSky(stars); // Re-plot stars in light mode
}


// Handle window resize
window.addEventListener('resize', () => {
    plotSky(stars);
});

let searchedStars = [];

function normalizeString(str) {
    return str.toLowerCase().replace(/[^a-z]/g, '');  // Only keep alphanumeric characters
}

// Function to search for a star by name and display multiple matches if found
function searchStarByName(starName) {
    const normalizedSearchName = normalizeString(starName);  // Normalize the search input

    const matchingStars = starsData.filter(star => {
        const normalizedStarName = normalizeString(star.name);  // Normalize the star name
        return normalizedStarName.includes(normalizedSearchName);  // Check if the search input is a substring
    });

    if (matchingStars.length > 0) {
        displaySearchResults(matchingStars);  // Display the matching stars
    } else {
        alert("No star found with the given name.");
    }
}

// Function to display the matching search results
function displaySearchResults(matchingStars) {
    const starListDiv = document.getElementById('starList');
    starListDiv.innerHTML = "";  // Reset the list

    matchingStars.forEach((star, index) => {
        const starItem = document.createElement('div');
        starItem.style.display = "flex";
        starItem.style.justifyContent = "space-between";
        starItem.style.alignItems = "center";
        starItem.style.padding = "5px 0";
        starItem.style.borderBottom = "1px solid #eee";

        // 별 이름과 정보 표시
        const starInfo = document.createElement('span');
        starInfo.textContent = `${getStarDisplayName(star)}`;
        starItem.appendChild(starInfo);

        // 선택 버튼 추가
        const selectButton = document.createElement('button');
        selectButton.textContent = "Select";
        selectButton.style.backgroundColor = "#28a745";
        selectButton.style.color = "white";
        selectButton.style.border = "none";
        selectButton.style.borderRadius = "4px";
        selectButton.style.cursor = "pointer";
        selectButton.style.padding = "5px 10px";
        selectButton.addEventListener('click', () => selectStar(star));  // Click event to select the star
        starItem.appendChild(selectButton);

        starListDiv.appendChild(starItem);
    });
}

// Function to select a star and add it to the searchedStars list
function selectStar(star) {

    const isDuplicate = searchedStars.some(selectedStar => selectedStar.name === star.name);

    if (isDuplicate) {
        alert("This star has already been added. Please select a different star.");
        return; // Stop the function if it's a duplicate
    }

    if (searchedStars.length < missingStarCount) {
        searchedStars.push(star);
        updateStarList();  // Update the main selected stars list
    } else {
        alert(`You can only select up to ${missingStarCount} stars.`);
    }
}

function updateStarList() {
    const starListDiv = document.getElementById('starList');
    starListDiv.innerHTML = "";  // Reset the list

    searchedStars.forEach((star, index) => {
        const starItem = document.createElement('div');
        starItem.style.display = "flex";
        starItem.style.justifyContent = "space-between";
        starItem.style.alignItems = "center";
        starItem.style.padding = "8px 0";
        starItem.style.borderBottom = "1px solid #eee";
        
        const starInfo = document.createElement('span');
        starInfo.textContent = `${index + 1}. ${getStarDisplayName(star)}`;
        starItem.appendChild(starInfo);
        
        // Create the Mark button
        const markButton = document.createElement('button');
        markButton.textContent = star.marked ? "Edit" : "Mark";
        markButton.style.backgroundColor = "#28a745";
        markButton.style.color = "white";
        markButton.style.border = "none";
        markButton.style.borderRadius = "4px";
        markButton.style.cursor = "pointer";
        markButton.style.padding = "5px 10px";
        
        // Event listener for the Mark button
        markButton.addEventListener('click', () => {
            isMarkingPosition = true;
            const canvas = document.getElementById("skyCanvas");
            toggleMarkingMode(true);

            if (star.marked) {
                star.circle = null;
                plotSky(stars);
            }

            markButton.textContent = 'Click to Place';
            if (isMarkingPosition) {
                canvas.style.cursor = 'none'; // Hide the cursor
            } else {
                canvas.style.cursor = 'default'; // Show the default cursor
            }

            const handleClick = (event) => {
                if (isMarkingPosition) {
                    const rect = canvas.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;

                    // Draw the circle and store its position
                    drawCircleOnCanvas(x, y, star);

                    // Mark the star as marked and update the button text
                    star.marked = true;
                    markButton.textContent = 'Edit';
                    canvas.style.cursor = 'default';

                    // Remove event listener after placing the mark
                    canvas.removeEventListener('click', handleClick);
                    isMarkingPosition = false;
                    plotSky(stars); // Re-plot to include the new circle
                    toggleMarkingMode(false);
                }
            };

            // Add click listener to canvas for placing the mark
            canvas.addEventListener('click', handleClick);
        });

        // Create the Remove button
        const removeButton = document.createElement('button');
        removeButton.innerHTML = "&#10006;";
        removeButton.style.backgroundColor = "transparent";
        removeButton.style.color = "#FF4136";
        removeButton.style.border = "none";
        removeButton.style.cursor = "pointer";
        removeButton.style.fontSize = "20px";
        removeButton.style.padding = "0";
        removeButton.style.margin = "0";
        removeButton.style.transition = "color 0.3s ease";

        removeButton.addEventListener('mouseover', () => {
            removeButton.style.color = "#d32f2f";
        });
        removeButton.addEventListener('mouseout', () => {
            removeButton.style.color = "#FF4136";
        });

        removeButton.addEventListener('click', () => removeStar(index));

        // Append both buttons to the star item
        starItem.appendChild(markButton);
        starItem.appendChild(removeButton);

        starListDiv.appendChild(starItem);
    });

    updateStarCount();
}


function removeStar(index) {
    const star = searchedStars[index];
    
    star.circle = null;
    star.marked = false;

    searchedStars.splice(index, 1);

    updateStarList();
    plotSky(stars);
}

function updateStarCount() {
    const starCountElement = document.getElementById('starCount');
    starCountElement.textContent = `${searchedStars.length}/${missingStarCount}`;
}

// Function to submit the selected stars and check if they are correct
function submitSelectedStars() {
    if (searchedStars.length !== missingStarCount) {
        alert(`Please select exactly ${missingStarCount} stars.`);
        return;
    }

    let correctCount = 0;
    searchedStars.forEach(searchedStar => {
        const isMissing = missingStars.some(missingStar => missingStar.name === searchedStar.name);
        if (isMissing) {
            correctCount++;
        }
    });

    alert(`You got ${correctCount} out of ${missingStarCount} correct.`);
}

function getStarDisplayName(starData) {
    if (starData.proper) {
        return `${starData.proper} (${starData.name})`;
    } else {
        return starData.name;
    }
}

// Add event listeners
document.getElementById('searchButton').addEventListener('click', () => {
    const starName = document.getElementById('starSearch').value.trim();
    if (starName) {
        searchStarByName(starName);
    } else {
        alert("Please enter a star name.");
    }
});

// Function to enable or disable the overlay and buttons during marking mode
function toggleMarkingMode(state) {
    const overlay = document.getElementById('overlay');
    const canvas = document.getElementById('skyCanvas');
    const buttons = document.querySelectorAll('#starList button');

    if (state) {
        overlay.style.display = 'block'; // Show the overlay
        canvas.style.cursor = 'none'; // Hide the cursor for marking mode
        buttons.forEach(button => button.disabled = true); // Disable other buttons
    } else {
        overlay.style.display = 'none'; // Hide the overlay
        canvas.style.cursor = 'default'; // Show the default cursor
        buttons.forEach(button => button.disabled = false); // Enable other buttons
    }
}


document.getElementById('submitButton').addEventListener('click', submitSelectedStars);

// Function to draw a circle and store its position
function drawCircleOnCanvas(x, y, star) {
    const canvas = document.getElementById("skyCanvas");
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();

    // Store the circle's position on the star object
    star.circle = { x, y, radius: 3 }; // Save x, y, and radius
}

// Show star info when hovering near a marked circle
document.getElementById("skyCanvas").addEventListener('mousemove', (event) => {
    const canvas = document.getElementById("skyCanvas");
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    plotSky(stars); // Re-plot the sky view and stars

    const ctx = canvas.getContext("2d");

    if (isMarkingPosition) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI); // Small circle as cursor
        ctx.fillStyle = 'red';
        ctx.fill();
    }

    // Iterate over stars to check if the mouse is near any marked circle
    searchedStars.forEach(star => {
        if (star.circle) {
            const distance = Math.sqrt(Math.pow(star.circle.x - x, 2) + Math.pow(star.circle.y - y, 2));
            if (distance < star.circle.radius + 5) {
                // If the mouse is close to the circle, display the star's name
                ctx.fillStyle = 'red';
                ctx.font = '14px Arial';
                ctx.fillText(`${getStarDisplayName(star)}`, star.circle.x + 10, star.circle.y - 10);
            }
        }
    });
});
