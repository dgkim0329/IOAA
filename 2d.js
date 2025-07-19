import { csvParse } from './js/d3-dsv.module.js';

let stars = [];
let starsData = [];
let missingStars = [];
let missingStarCount = 0;
let limitingMagnitude = 0;
let isMarkingPosition = false;

let lat = 0;
let sid = 0;
let off = 0;

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

    document.getElementById('submitButton').addEventListener('click', () => {
        // Show the confirmation modal when the submit button is clicked
        const confirmationModal = document.getElementById('confirmationModal');
        confirmationModal.style.display = 'block';
    });
    
    // Handle confirmation of submission
    document.getElementById('confirmSubmitButton').addEventListener('click', () => {
        // Proceed with submission
        submitSelectedStars();
        // Hide the confirmation modal after confirming
        const confirmationModal = document.getElementById('confirmationModal');
        confirmationModal.style.display = 'none';
    });
    
    // Handle cancellation of submission
    document.getElementById('cancelSubmitButton').addEventListener('click', () => {
        // Hide the confirmation modal if the user cancels
        const confirmationModal = document.getElementById('confirmationModal');
        confirmationModal.style.display = 'none';
    });
    

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

        lat = 38;
        sid = Math.random() * 360;
        off = Math.random() * 360;
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

    const brightStarsToRemove = starsAboveFiveDegrees.filter(star => star.mag < limitingMagnitude);

    for (let i = 0; i < missingStarCount && brightStarsToRemove.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * brightStarsToRemove.length);
        const removedStar = brightStarsToRemove.splice(randomIndex, 1)[0];

        // Store the RA and Dec of the missing star
        missingStars.push({ ra: removedStar.ra, dec: removedStar.dec, name: removedStar.name });
    }

    console.log(missingStars);

    // Plot the remaining stars
    starsAboveHorizon.forEach(star => {
        if (!missingStars.some(missingStar => missingStar.name === star.name)) {
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
        markButton.style.marginLeft = "auto";
        
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
        showResultModal(`Please select exactly ${missingStarCount} stars.`, []);
        return;
    }

    let correctCount = 0;
    const resultDetails = searchedStars.map(searchedStar => {
        const missingStar = missingStars.find(ms => ms.name === searchedStar.name);

        let angularDistance = null;
        let distanceCategory = "N/A";
        if (missingStar && searchedStar.circle) {
            // Convert the x, y of the circle to altitude and azimuth for the marked star
            const { alt: markedAlt, az: markedAz } = convertXYToAltAz(
                searchedStar.circle.x,
                searchedStar.circle.y
            );

            // Convert the x, y of the missing star to altitude and azimuth
            const { alt: missingAlt, az: missingAz } = calculateAltAz(
                missingStar.ra,
                missingStar.dec
            );

            // Calculate the angular distance between the marked and missing positions
            angularDistance = calculateAngularDistance(markedAlt, markedAz, missingAlt, missingAz);

            // Classify the distance into categories
            if (angularDistance < 1) {
                distanceCategory = "Very Close (< 1°)";
            } else if (angularDistance < 2.5) {
                distanceCategory = "Close (1° - 2.5°)";
            } else if (angularDistance < 5) {
                distanceCategory = "Moderate (2.5° - 5°)";
            } else {
                distanceCategory = "Far (> 5°)";
            }

            correctCount++;
        }

        return {
            name: getStarDisplayName(searchedStar),
            status: missingStar ? 'correct' : 'incorrect',
            distance: distanceCategory
        };
    });

    showResultModal(`You got ${correctCount} out of ${missingStarCount} correct.`, resultDetails);
}

function calculateAltAz(ra, dec) {
    const raRad = 15 * deg2rad(ra); // Right Ascension in radians (multiply by 15 to convert hours to degrees)
    const decRad = deg2rad(dec); // Declination in radians
    const observerLat = deg2rad(lat); // Observer's latitude in radians

    const hourAngle = deg2rad(sid) - raRad; // Sidereal time minus RA gives the hour angle

    // Calculate the altitude
    const sinAlt = Math.sin(decRad) * Math.sin(observerLat) + Math.cos(decRad) * Math.cos(observerLat) * Math.cos(hourAngle);
    const alt = Math.asin(sinAlt) * (180 / Math.PI);

    // Calculate sinAz and cosAz for the azimuth
    const cosAz = (Math.sin(decRad) - Math.sin(deg2rad(alt)) * Math.sin(observerLat)) / (Math.cos(deg2rad(alt)) * Math.cos(observerLat));
    const sinAz = -Math.cos(decRad) * Math.sin(hourAngle) / Math.cos(deg2rad(alt));

    // Use atan2 to determine the azimuth, adjusted for the offset
    let az = off - Math.atan2(sinAz, cosAz) * (180 / Math.PI);

    // Adjust azimuth to the range [0, 360)
    az = (az + 360) % 360;

    return { alt: alt, az: az };
}



function convertXYToAltAz(x, y) {
    const canvas = document.getElementById("skyCanvas");
    const centerX = canvas.width * 0.3;
    const centerY = canvas.height * 50.2 / 100;
    const radius = Math.min(centerX, centerY, canvas.height - centerY) - 10;

    // Convert x, y to normalized coordinates (-1 to 1)
    const normalizedX = (x - centerX) / radius;
    const normalizedY = (y - centerY) / radius; // Invert Y to match celestial coordinates

    // Calculate azimuth and altitude based on normalized coordinates
    const azimuth = Math.atan2(-normalizedX, normalizedY) * (180 / Math.PI);
    const altitude = 90 * (1 - (Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY)))


    return { alt: altitude, az: (azimuth + 360) % 360 };
}

function calculateAngularDistance(alt1, az1, alt2, az2) {

    // Convert angles to radians for calculation
    const alt1Rad = deg2rad(alt1);
    const az1Rad = deg2rad(az1);
    const alt2Rad = deg2rad(alt2);
    const az2Rad = deg2rad(az2);

    // Calculate the angular distance
    const cosTheta = Math.sin(alt1Rad) * Math.sin(alt2Rad) + Math.cos(alt1Rad) * Math.cos(alt2Rad) * Math.cos(az1Rad - az2Rad);
    return Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI); // Convert radians to degrees
}

function showResultModal(message, details) {
    const resultModal = document.getElementById('resultModal');
    const isDarkMode = document.body.classList.contains('dark-mode');

    // Apply dark mode styles
    resultModal.style.backgroundColor = isDarkMode ? '#333' : 'white';
    resultModal.style.color = isDarkMode ? '#f9f9f9' : '#333';
    resultModal.style.boxShadow = isDarkMode ? '0 6px 15px rgba(0, 0, 0, 0.7)' : '0 6px 15px rgba(0, 0, 0, 0.3)';

    // Populate the result details
    const resultMessage = document.getElementById('resultMessage');
    const resultDetailsList = document.getElementById('resultDetails');
    resultMessage.textContent = message;
    resultDetailsList.innerHTML = '';

    details.forEach(detail => {
        const listItem = document.createElement('li');
        listItem.style.display = 'flex';
        listItem.style.alignItems = 'center';
        listItem.style.marginBottom = '8px';
        listItem.style.gap = '15px';

        const icon = document.createElement('i');
        icon.style.marginRight = '10px';
        if (detail.status === 'correct') {
            icon.className = 'fas fa-check-circle';
            icon.style.color = '#28a745';
        } else {
            icon.className = 'fas fa-times-circle';
            icon.style.color = '#FF4136';
        }

        const starInfo = document.createElement('span');
        starInfo.textContent = detail.name;
        starInfo.style.flex = '1';
        starInfo.style.marginRight = '20px';

        const distanceInfo = document.createElement('span');
        distanceInfo.textContent = detail.distance;
        distanceInfo.style.fontSize = '16px';
        distanceInfo.style.textAlign = 'right';
        distanceInfo.style.minWidth = '100px';
        distanceInfo.style.color = getDistanceColor(detail.distance);

        listItem.appendChild(icon);
        listItem.appendChild(starInfo);
        listItem.appendChild(distanceInfo);
        resultDetailsList.appendChild(listItem);
    });

    resultModal.style.display = 'block';
}


function getDistanceColor(distance) {
    switch (distance) {
        case "Very Close (< 1°)":
            return '#28a745'; // Green
        case "Close (1° - 2.5°)":
            return '#007BFF'; // Blue
        case "Moderate (2.5° - 5°)":
            return '#FF851B'; // Orange
        case "Far (> 5°)":
            return '#FF4136'; // Red
        default:
            return '#999'; // Grey for 'N/A'
    }
}

document.getElementById('exitButton').addEventListener('click', () => {
    // Redirect to index.html
    window.location.href = 'index.html';
});

document.getElementById('retryButton').addEventListener('click', () => {
    // Simply close the results modal without resetting anything
    const resultModal = document.getElementById('resultModal');
    resultModal.style.display = 'none';
});


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

function showConfirmationModal() {
    const confirmationModal = document.getElementById('confirmationModal');
    const isDarkMode = document.body.classList.contains('dark-mode');

    // Apply dark mode styles to the confirmation modal
    confirmationModal.style.backgroundColor = isDarkMode ? '#333' : 'white';
    confirmationModal.style.color = isDarkMode ? '#f9f9f9' : '#333';
    confirmationModal.style.boxShadow = isDarkMode ? '0 6px 15px rgba(0, 0, 0, 0.7)' : '0 6px 15px rgba(0, 0, 0, 0.3)';

    confirmationModal.style.display = 'block';
}

document.getElementById('submitButton').addEventListener('click', showConfirmationModal);


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
