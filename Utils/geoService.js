const axios = require("axios");

 const geocodeAddress = async (addressString) => {
  try {
    const apiKey = process.env.LOCATIONIQ_API_KEY;
    const url = `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(
      addressString
    )}&format=json`;

    const { data } = await axios.get(url);
    if (!data || !data[0]) return null;

    const loc = data[0];
    return {
      latitude: parseFloat(loc.lat),
      longitude: parseFloat(loc.lon),
      displayName: loc.display_name,
    };
  } catch (err) {
    console.error("Geocoding failed:", err.message);
    return null;
  }
};

module.exports = {geocodeAddress}
