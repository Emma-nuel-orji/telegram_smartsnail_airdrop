const express = require('express');
const app = express();
app.use(express.json());

const generateUniqueCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

app.post('/api/purchase', async (req, res) => {
  const { fuckedUpBagsQty, humanNatureQty, email } = req.body;
  const totalBooks = fuckedUpBagsQty + humanNatureQty;
  const uniqueCodes = Array.from({ length: totalBooks }, generateUniqueCode);

  // Here, you would send the email with the unique codes and save codes to the database
  console.log(`Sending codes to ${email}:`, uniqueCodes);

  res.send({ message: 'Purchase completed, codes sent via email.' });
});

app.listen(5000, () => console.log('Server running on port 5000'));

