const asyncHandler = require("../utils/asyncHandler");
const contactService = require("../services/contact.service");

const submitContact = asyncHandler(async (req, res) => {
  const payload = contactService.validateContactBody(req.body);
  await contactService.sendContactEmail(payload);
  return res.status(200).json({
    success: true,
    message: "Thank you. Your message has been sent.",
  });
});

module.exports = {
  submitContact,
};
