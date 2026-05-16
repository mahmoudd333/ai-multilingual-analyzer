async function analyzeText() {

    const text = document.getElementById("textInput").value;

    const response = await fetch("/analyze", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
    });

    const data = await response.json();

    document.getElementById("language").textContent =
        data.language;

    document.getElementById("translation").textContent =
        data.translation;

    document.getElementById("sentiment").textContent =
        data.sentiment;

    document.getElementById("confidence").textContent =
        data.confidence;
}