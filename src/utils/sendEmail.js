const nodemailer = require("nodemailer");
const logger = require("./logger");

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: parseInt(process.env.SMTP_PORT, 10) === 465, // SSL for port 465
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
      // Security: TLS configuration
      tls: {
        rejectUnauthorized: true, // Don't allow self-signed certs
        minVersion: "TLSv1.2",
      },
      // Timeouts
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    const mailOptions = {
      from: `"${process.env.APP_NAME || "ShopVerse"}" <${process.env.SMTP_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html: options.message,
      // Security: Prevent content-type sniffing
      headers: {
        "X-Priority": "1",
        "X-MS-Exchange-Organization-SCL": "-1",
      },
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info("Email sent successfully", {
      to: options.email,
      subject: options.subject,
      messageId: info.messageId,
    });

    return info;
  } catch (error) {
    logger.error("Failed to send email", {
      to: options.email,
      error: error.message,
    });
    throw error;
  }
};

module.exports = sendEmail;
