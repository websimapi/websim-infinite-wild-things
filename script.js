``` script.js
import * as websim from "llm-calls";

const sceneContainer = document.getElementById('scene-container');
const sceneImage = document.getElementById('scene-image');
const clickableRegionsContainer = document.getElementById('clickable-regions');
const inventoryList = document.getElementById('collected-items-list');
const loadingOverlay = document.getElementById('loading-overlay');

let currentScene = {
    prompt: "A whimsical jungle clearing where strange, colorful plants grow under a purple sky, children's crayon drawing style, Where The Wild Things Are aesthetic.",
    imageUrl: null,
    regions: [],
};

let collectedItems = [];

// --- LLM Interaction ---

async function generateImage(prompt) {
    console.log("Generating image for prompt:", prompt);
    try {
        loadingOverlay.classList.add('visible');
        loadingOverlay.querySelector('p').textContent = 'Generating scene...';
        const result = await websim.imageGen({
            prompt: prompt,
            aspect_ratio: "16:9",
        });
        console.log("Image generated:", result.url);
        return result.url;
    } catch (error) {
        console.error("Error generating image:", error);
        alert("Failed to generate the scene image. Please try again.");
        loadingOverlay.classList.remove('visible');
        return null;
    }
}

async function analyzeImageForRegions(imageUrl) {
    console.log("Analyzing image for regions:", imageUrl);
    try {
        loadingOverlay.querySelector('p').textContent = 'Analyzing scene...';
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an assistant analyzing images for an interactive game based on "Where The Wild Things Are". Identify distinct objects, potential items to collect, interesting features, or paths/exits within the image. For each identified region, provide a name, a brief description, its type ('item', 'path', 'feature'), and its bounding box coordinates (top-left x, top-left y, width, height) as percentages relative to the image dimensions (0-100). Respond ONLY with a JSON object containing a list called "regions", where each element follows this schema: { "name": string, "description": string, "type": "item" | "path" | "feature", "coordinates": { "x": number, "y": number, "width": number, "height": number } }. Ensure coordinates are numbers between 0 and 100. Focus on 3-5 key interactive elements. Be imaginative and fit the whimsical, slightly wild theme.`,
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analyze the provided image and identify interactive regions according to the specified JSON schema." },
                        { type: "image_url", image_url: { url: imageUrl } },
                    ],
                },
            ],
            json: true,
        });

        const result = JSON.parse(completion.content);
        console.log("Analysis result:", result);
        return result.regions || []; // Ensure we always return an array

    } catch (error) {
        console.error("Error analyzing image:", error);
        alert("Failed to analyze the scene. Some elements might not be interactive.");
        return []; // Return empty array on error
    } finally {
       // Loading overlay hidden after scene update
    }
}

// --- Scene Management ---

function updateScene() {
    console.log("Updating scene display");
    sceneImage.src = currentScene.imageUrl;

    // Clear previous regions
    clickableRegionsContainer.innerHTML = '';

    // Add new regions
    currentScene.regions.forEach(region => {
        const regionEl = document.createElement('div');
        regionEl.classList.add('clickable-region');
        regionEl.style.left = `${region.coordinates.x}%`;
        regionEl.style.top = `${region.coordinates.y}%`;
        regionEl.style.width = `${region.coordinates.width}%`;
        regionEl.style.height = `${region.coordinates.height}%`;
        regionEl.dataset.name = region.name;
        regionEl.dataset.description = region.description;
        regionEl.dataset.type = region.type;
        regionEl.title = `${region.name}: ${region.description}`; // Tooltip on hover

        regionEl.addEventListener('click', handleRegionClick);
        clickableRegionsContainer.appendChild(regionEl);
    });

     loadingOverlay.classList.remove('visible');
}

async function generateAndDisplayScene(prompt) {
    const imageUrl = await generateImage(prompt);
    if (!imageUrl) return; // Stop if image generation failed

    const regions = await analyzeImageForRegions(imageUrl);

    currentScene = {
        prompt: prompt,
        imageUrl: imageUrl,
        regions: regions,
    };

    updateScene();
}

// --- Interaction Handling ---

function handleRegionClick(event) {
    const regionEl = event.target;
    const type = regionEl.dataset.type;
    const name = regionEl.dataset.name;
    const description = regionEl.dataset.description;

    console.log(`Clicked region: ${name} (${type}) - ${description}`);

    switch (type) {
        case 'item':
            if (!collectedItems.includes(name)) {
                collectedItems.push(name);
                updateInventoryUI();
                // Optional: Visually indicate item collected (e.g., fade out)
                regionEl.style.opacity = '0.3';
                regionEl.style.pointerEvents = 'none'; // Prevent re-clicking
                alert(`Collected ${name}!`);
            } else {
                 alert(`You already collected ${name}.`);
            }
            break;
        case 'path':
            // Generate a new scene prompt based on the path description or a more generic one
            const nextPrompt = `Following the path towards "${description}", leading to another scene in the style of Where The Wild Things Are, crayon drawing aesthetic. Current location described as: ${currentScene.prompt}`;
            generateAndDisplayScene(nextPrompt);
            break;
        case 'feature':
            // Display description or trigger a small event
            alert(`You look closer at the ${name}. ${description}`);
            break;
        default:
            console.warn("Clicked region with unknown type:", type);
            alert(`You examine the ${name}. It looks interesting.`);
    }
}

// --- Inventory Management ---

function updateInventoryUI() {
    inventoryList.innerHTML = ''; // Clear list
    if (collectedItems.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Nothing collected yet.';
        inventoryList.appendChild(li);
    } else {
        collectedItems.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            inventoryList.appendChild(li);
        });
    }
}


// --- Initial Load ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing game.");
    updateInventoryUI(); // Show initial empty inventory
    generateAndDisplayScene(currentScene.prompt);
});

