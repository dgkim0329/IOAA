import { csvParse } from './js/d3-dsv.module.js';

let stars = [];
let starsData = [];
let missingStars = [];
let missingStarCount = 0;
let limitingMagnitude = 0;

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

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw circle for the sky view boundary
    const centerX = canvas.width / 3;
    const centerY = canvas.height * 50.2 / 100;
    const radius = Math.min(centerX, centerY, canvas.height - centerY) - 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "white";
    ctx.lisidth = 2;
    ctx.stroke();

    // Draw the stars
    stars.forEach(star => {
        if (star.x) {
            const x = centerX + star.x * radius;
            const y = centerY + star.y * radius;
            const size = Math.min(8, 8 * Math.pow(10, -0.22 * star.mag));
            ctx.beginPath();
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.fillStyle = "white";
            ctx.fill();
        }
    });
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
    if (searchedStars.length < missingStarCount) {
        searchedStars.push(star);
        updateStarList();  // Update the main selected stars list
    } else {
        alert(`You can only select up to ${missingStarCount} stars.`);
    }
}

// Function to update the main selected star list on the screen
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
        
        const removeButton = document.createElement('button');
        removeButton.innerHTML = "&#10006;";  // Unicode for a cross symbol (X)
        removeButton.style.backgroundColor = "transparent";  // No background
        removeButton.style.color = "#FF4136";  // Red X color
        removeButton.style.border = "none";  // No border
        removeButton.style.cursor = "pointer";
        removeButton.style.fontSize = "20px";  // Larger X symbol
        removeButton.style.padding = "0";  // Remove padding to make it compact
        removeButton.style.margin = "0";  // Remove margin for cleaner look
        removeButton.style.transition = "color 0.3s ease";  // Smooth color transition

        removeButton.addEventListener('mouseover', () => {
            removeButton.style.color = "#d32f2f";  // Darker red on hover
        });
        removeButton.addEventListener('mouseout', () => {
            removeButton.style.color = "#FF4136";  // Original red color
        });

        removeButton.addEventListener('click', () => removeStar(index));  // Click event to remove the star
        starItem.appendChild(removeButton);
        
        starListDiv.appendChild(starItem);
    });

    updateStarCount();
}

function removeStar(index) {
    searchedStars.splice(index, 1);  // Remove the star at the given index
    updateStarList();  // Update the star list display
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

document.getElementById('submitButton').addEventListener('click', submitSelectedStars);