const axios = require("axios");

const getPhrase = async (req, res) => {
  try {
    const response = await axios.get(
      "https://frasedeldia.azurewebsites.net/api/phrase"
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error fetching the phrase" });
  }
};

module.exports = {
  getPhrase,
};
