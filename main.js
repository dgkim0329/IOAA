import * as THREE from './js/three.module.js';
import { OrbitControls } from './js/OrbitControls.js';
import { csvParse } from './js/d3-dsv.module.js';
import { CSS2DRenderer, CSS2DObject } from './js/CSS2DRenderer.js';

// Set a path to the data
const path = './data/StarCatalogue.csv';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
camera.position.set(0, 0, 1);
const raDecGroup = new THREE.Group();
const constellationLinesGroup = new THREE.Group();
scene.add(constellationLinesGroup);
scene.add(raDecGroup);
scene.background = new THREE.Color(0x000000);

let starsData;
let stars;
let circleOutlineMesh;

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('skyCanvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.rotateSpeed = 0.75;

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

let isGalaxyVisible = false;

// Encapsulate the main logic inside a function
function startVisualization(missingStarCount, limitingMagnitude) {

    async function initThreeJS() {
        await loadStarData();
        createStars(starsData);
        removeRandomStars(missingStarCount, limitingMagnitude);
        addRaDecLines();
        raDecGroup.visible = false;
        animate();
        addMilkyWayTexture(192.85948, 27.12825, 266.41683);
        updateStarList();
    }

    initThreeJS();

    let searchedStars = [];
    let missingStars = [];

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

    function updateStarCount() {
        const starCountElement = document.getElementById('starCount');
        starCountElement.textContent = `${searchedStars.length}/${missingStarCount}`;
    }

    // Function to remove a star from the searchedStars list
    function removeStar(index) {
        searchedStars.splice(index, 1);  // Remove the star at the given index
        updateStarList();  // Update the star list display
    }


    // Function to remove stars based on the count and magnitude limit
    function removeRandomStars(count, magLimit) {
        const filteredStars = starsData.filter(star => parseFloat(star.mag) <= magLimit);

        if (filteredStars.length <= count) {
            console.error("Not enough stars to remove.");
            return;
        }

        // Shuffle the filtered stars
        const shuffledStars = filteredStars.sort(() => 0.5 - Math.random());

        // Take the first 'count' stars to remove
        missingStars = shuffledStars.slice(0, count);  // Store removed stars in missingStars

        console.log("Missing stars: ", missingStars);

        // Hide stars from the sky
        const positions = stars.geometry.attributes.position.array;
        missingStars.forEach(star => {
            const index = starsData.indexOf(star);
            // Setting their positions off-screen to "remove" them
            positions[index * 3] = positions[index * 3 + 1] = positions[index * 3 + 2] = 999999;
        });

        stars.geometry.attributes.position.needsUpdate = true;
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



    // Load star data from a CSV file (stored in the global variable starsData)
    async function loadStarData() {
        try {
            const response = await fetch(path);
            const csvText = await response.text();
            starsData = csvParse(csvText); 
        } catch (error) {
            starsData = [];
        }
    }

    // Function to create stars
    function createStars(starsData) {
        const radius = 1000;
        const positions = [];
        const colors = [];
        const sizes = [];
        const originalColors = [];

        starsData.forEach(star => {
            const { ra, dec, mag, spect } = star;

            const pos = celestialToSpherical(15 * parseFloat(ra), parseFloat(dec), radius);
            positions.push(pos.x, pos.y, pos.z);

            const magnitude = parseFloat(mag);
            const size = Math.exp(-0.28 * magnitude);
            sizes.push(size * 200);

            const brightnessFactor = Math.min(Math.max(0.8, 1 - 0.03 * magnitude), 1);

            let color;
            switch (spect.charAt(0)) {
                case 'O':
                    color = new THREE.Color(0.5, 0.5, 1.0).multiplyScalar(brightnessFactor);
                    break;
                case 'B':
                    color = new THREE.Color(0.7, 0.7, 1.0).multiplyScalar(brightnessFactor);
                    break;
                case 'A':
                    color = new THREE.Color(0.9, 0.9, 1.0).multiplyScalar(brightnessFactor);
                    break;
                case 'F':
                    color = new THREE.Color(1.0, 1.0, 0.9).multiplyScalar(brightnessFactor);
                    break;
                case 'G':
                    color = new THREE.Color(1.0, 0.9, 0.7).multiplyScalar(brightnessFactor);
                    break;
                case 'K':
                    color = new THREE.Color(1.0, 0.8, 0.6).multiplyScalar(brightnessFactor);
                    break;
                case 'M':
                    color = new THREE.Color(1.0, 0.7, 0.7).multiplyScalar(brightnessFactor);
                    break;
                default:
                    color = new THREE.Color(1.0, 1.0, 1.0).multiplyScalar(brightnessFactor);
                    break;
            }
            originalColors.push(color.r, color.g, color.b);
            colors.push(color.r, color.g, color.b);
        });

        // Set the star positions, colors, and sizes using BufferGeometry
        const geometry = new THREE.BufferGeometry();

        const positionArray = new Float32Array(positions);
        geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));

        const colorArray = new Float32Array(colors);
        geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

        const sizeArray = new Float32Array(sizes);
        geometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));

        geometry.setAttribute('originalColor', new THREE.BufferAttribute(new Float32Array(originalColors), 3));

        // Create stars using ShaderMaterial
        const material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: new THREE.TextureLoader().load('./textures/star.png') },
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;

                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vec4 projectedPosition = mvPosition;
                    float dist = length(mvPosition.xyz);
                    gl_PointSize = size * (100.0 / dist);
                    gl_PointSize = clamp(gl_PointSize, 1.0, 50.0);
                    gl_Position = projectionMatrix * projectedPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec3 vColor;

                void main() {
                vec4 color = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
                if (color.a < 0.5) discard;
                gl_FragColor = color;
            }
            `,
            vertexColors: true,
            transparent: true,
            alphaTest: 0.5
        });

        stars = new THREE.Points(geometry, material);
        scene.add(stars);
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
    }
}

// Event listener when the "Start" button is pressed
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const missingStarCount = parseInt(params.get('missingStars'));
    const limitingMagnitude = parseFloat(params.get('limitingMag'));
    
    // Execute the main visualization logic
    startVisualization(missingStarCount, limitingMagnitude);

    const searchContainer = document.getElementById('searchContainer');
    const opacitySlider = document.getElementById('opacitySlider');
    const closeButton = document.getElementById('closeButton');
    const dragHandle = document.getElementById('dragHandle');

    let isDragging = false;
    let offsetX, offsetY;
    
    // 슬라이더 값이 변경될 때 검색창의 투명도를 업데이트
    opacitySlider.addEventListener('input', (e) => {
        const opacityValue = e.target.value;
        searchContainer.style.opacity = opacityValue;
    });

    opacitySlider.addEventListener('mousedown', (e) => {
        e.stopPropagation();  // 검색창 드래그 이벤트가 발생하지 않도록 차단
    });

    

    // 검색창 닫기 버튼 클릭 시 검색창 숨기기
    closeButton.addEventListener('click', () => {
        searchContainer.style.display = 'none';
    });

    // 검색창 드래그 시작
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - searchContainer.getBoundingClientRect().left;
        offsetY = e.clientY - searchContainer.getBoundingClientRect().top;
        document.body.style.userSelect = 'none';  // 드래그 중 텍스트 선택 방지
    });

    // 검색창 드래그 중
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            searchContainer.style.left = `${e.clientX - offsetX}px`;
            searchContainer.style.top = `${e.clientY - offsetY}px`;
        }
    });

    // 검색창 드래그 종료
    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';  // 드래그가 끝나면 텍스트 선택 가능하게
    });

    const settingsButton = document.getElementById('settingsButton');
    const settingsMenu = document.getElementById('settingsMenu');
    const toggleMilkyWay = document.getElementById('toggleMilkyWay');
    const toggleRaLines = document.getElementById('toggleRaLines');
    const toggleDecLines = document.getElementById('toggleDecLines');

    settingsButton.addEventListener('click', () => {
        settingsMenu.style.display = settingsMenu.style.display === 'none' ? 'block' : 'none';
        });

    toggleMilkyWay.addEventListener('change', (e) => {
        if (e.target.checked) {
            isGalaxyVisible = true;
            toggleMilkyWayVisibility();
        } else {
            isGalaxyVisible= false;
            toggleMilkyWayVisibility();
                }
    });
    toggleRaLines.addEventListener('change', (e) => {
        if (e.target.checked) {
            raDecGroup.visible = true;
        } else {
            raDecGroup.visible = false;
        }
    });
});

function getStarDisplayName(starData) {
    if (starData.proper) {
        return `${starData.proper} (${starData.name})`;
    } else {
        return starData.name;
    }
}

function celestialToSpherical(ra, dec, radius) {
    const raRad = -THREE.MathUtils.degToRad(ra);
    const decRad = THREE.MathUtils.degToRad(dec);

    const x = radius * Math.cos(decRad) * Math.cos(raRad);
    const y = radius * Math.sin(decRad);
    const z = radius * Math.cos(decRad) * Math.sin(raRad);

    return new THREE.Vector3(x, y, z);
}

// FOV adjustment function (adjust FOV through scroll events)
function adjustFOV(event) {
    const zoomSpeed = 1;
    const fovMin = 10;
    const fovMax = 75;

    if (event.deltaY > 0) {
        camera.fov = Math.min(fovMax, camera.fov + zoomSpeed);
    } else {
        camera.fov = Math.max(fovMin, camera.fov - zoomSpeed);
    }

    camera.updateProjectionMatrix();
    controls.rotateSpeed = camera.fov / 75;
    if (circleOutlineMesh) {
        updateCircleOutlineScale(circleOutlineMesh.starData, circleOutlineMesh.position);
    }
}

// Add scroll event listener
window.addEventListener('wheel', adjustFOV);

// Handle window resize
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

let milkyWay = null;
function addMilkyWayTexture(galacticNorthRa, galacticNorthDec, galacticCenterRa) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./textures/milkyway.png', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.set(1, 1);

        const milkyWayMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            color: 0xffffff
        });

        const milkyWayRadius  = 1200;
        const milkyWayHeight = 1600;
        const milkyWayGeometry = new THREE.CylinderGeometry(
            milkyWayRadius,
            milkyWayRadius,
            milkyWayHeight,
            128,
            1,
            true,
            0,
            Math.PI * 2.003
        );
    
        milkyWay = new THREE.Mesh(milkyWayGeometry, milkyWayMaterial);

        const radius = 1;
        const galacticNorthVector = celestialToSpherical(galacticNorthRa, galacticNorthDec, radius);
        
        const upVector = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, galacticNorthVector);

        milkyWay.applyQuaternion(quaternion);

        const galacticCenterRadRa = THREE.MathUtils.degToRad(galacticCenterRa);
        milkyWay.rotateY(galacticCenterRadRa);
        milkyWay.rotateY(-Math.PI / 2);

        if (isGalaxyVisible) {
            scene.add(milkyWay);
        }
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
    scene.add(ambientLight);
}

function toggleMilkyWayVisibility() {
    if (milkyWay) {
        if (isGalaxyVisible) {
            scene.add(milkyWay);
        } else {
            scene.remove(milkyWay);
        }
    }
}

function addRaDecLines() {
    const radius = 1000;
    const raSegments = 12;
    const decSegments = 6;

    // Add RA lines
    for (let i = 0; i < raSegments; i++) {
        const raAngle = i * 30;
        const raGeometry = new THREE.BufferGeometry();
        const raPositions = [];
        for (let j = 0; j <= 64; j++) {
            const decAngle = (j / 64) * Math.PI - Math.PI / 2;
            const x = radius * Math.cos(decAngle) * Math.cos(THREE.MathUtils.degToRad(raAngle));
            const y = radius * Math.sin(decAngle);
            const z = radius * Math.cos(decAngle) * Math.sin(THREE.MathUtils.degToRad(raAngle));
            raPositions.push(x, y, z);
        }
        raGeometry.setAttribute('position', new THREE.Float32BufferAttribute(raPositions, 3));
        const raMaterial = new THREE.LineBasicMaterial({ color: 0x4444ff });
        const raLine = new THREE.Line(raGeometry, raMaterial);
        raDecGroup.add(raLine);  // Add line to group
    }

    // Add DEC lines
    for (let i = -decSegments; i <= decSegments; i++) {
        const decAngle = i * 30;
        const decGeometry = new THREE.BufferGeometry();
        const decPositions = [];
        for (let j = 0; j <= 360; j++) {
            const raAngle = (j / 360) * Math.PI * 2;
            const x = radius * Math.cos(THREE.MathUtils.degToRad(decAngle)) * Math.cos(raAngle);
            const y = radius * Math.sin(THREE.MathUtils.degToRad(decAngle));
            const z = radius * Math.cos(THREE.MathUtils.degToRad(decAngle)) * Math.sin(raAngle);
            decPositions.push(x, y, z);
        }
        decGeometry.setAttribute('position', new THREE.Float32BufferAttribute(decPositions, 3));
        const decMaterial = new THREE.LineBasicMaterial({ color: 0xff4444 });
        const decLine = new THREE.Line(decGeometry, decMaterial);
        raDecGroup.add(decLine);  // Add line to group
    }
}