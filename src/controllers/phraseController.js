const axios = require("axios");

const PHRASE_API_URL = "https://zenquotes.io/api/today";

const getPhrase = async (_req, res) => {
  try {
    const { data } = await axios.get(PHRASE_API_URL, { timeout: 8000 });

    const quote = Array.isArray(data) ? data[0] : data;

    return res.json({
      phrase: quote?.q || "Hoy es un buen día para empezar algo nuevo.",
      author: quote?.a || "Desconocido",
      source: PHRASE_API_URL,
    });
  } catch (error) {
    console.error("Error fetching phrase from external API:", error.message);

    return res.status(200).json({
      phrase: "Hoy es un buen día para empezar algo nuevo.",
      author: "DocuCloud",
      source: "fallback",
    });
  }
};

module.exports = {
  getPhrase,
};
