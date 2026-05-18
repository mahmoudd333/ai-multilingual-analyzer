const { BlobServiceClient } =
require("@azure/storage-blob");

const blobServiceClient =
BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
);

const containerName = "uploads";


require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));



app.post("/analyze", async (req, res) => {

    const text = req.body.text;

const containerClient =
    blobServiceClient.getContainerClient(containerName);

const fileName =
    `input-${Date.now()}.txt`;

const blockBlobClient =
    containerClient.getBlockBlobClient(fileName);

await blockBlobClient.upload(
    text,
    Buffer.byteLength(text)
);

    try {

        // -----------------------------
        // 1. Detect Language
        // -----------------------------
        const languageResponse = await axios.post(
            `${process.env.LANGUAGE_ENDPOINT}/language/:analyze-text?api-version=2023-04-01`,
            {
                kind: "LanguageDetection",
                analysisInput: {
                    documents: [
                        {
                            id: "1",
                            text: text
                        }
                    ]
                }
            },
            {
                headers: {
                    "Ocp-Apim-Subscription-Key":
                        process.env.LANGUAGE_KEY,
                    "Content-Type":
                        "application/json"
                }
            }
        );

        const detectedLanguage =
            languageResponse.data.results.documents[0]
            .detectedLanguage.name;


        // -----------------------------
        // 2. Translate Text
        // -----------------------------
        const translateResponse = await axios.post(
            `${process.env.TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to=en`,
            [{ text }],
            {
                headers: {
                    "Ocp-Apim-Subscription-Key":
                        process.env.TRANSLATOR_KEY,

                    "Ocp-Apim-Subscription-Region":
                        process.env.TRANSLATOR_REGION,

                    "Content-Type":
                        "application/json"
                }
            }
        );

        const translatedText =
            translateResponse.data[0]
            .translations[0].text;


        // -----------------------------
        // 3. Sentiment Analysis
        // -----------------------------
        const sentimentResponse = await axios.post(
            `${process.env.LANGUAGE_ENDPOINT}/language/:analyze-text?api-version=2023-04-01`,
            {
                kind: "SentimentAnalysis",
                analysisInput: {
                    documents: [
                        {
                            id: "1",
                            text: translatedText
                        }
                    ]
                }
            },
            {
                headers: {
                    "Ocp-Apim-Subscription-Key":
                        process.env.LANGUAGE_KEY,
                    "Content-Type":
                        "application/json"
                }
            }
        );

        const sentimentDoc =
            sentimentResponse.data.results.documents[0];

        res.json({
            language: detectedLanguage,
            translation: translatedText,
            sentiment: sentimentDoc.sentiment,
            confidence:
                sentimentDoc.confidenceScores.positive
        });

    } catch (error) {

        console.error(error.response?.data || error);

        res.status(500).json({
            error: "Something went wrong"
        });
    }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});