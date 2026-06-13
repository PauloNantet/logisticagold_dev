function crc16(str) {
  let crc = 0xffff;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc <<= 1) & 0x10000) crc ^= 0x1021;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function format(id, value) {
  const size = value.length.toString().padStart(2, "0");
  return id + size + value;
}

export function gerarPix({ chave, nome, cidade, valor }) {
  const payload =
    "000201" +
    format(
      "26",
      format("00", "BR.GOV.BCB.PIX") +
      format("01", chave)
    ) +
    "52040000" +
    "5303986" +
    format("54", valor.toFixed(2)) +
    "5802BR" +
    format("59", nome.substring(0, 25)) +
    format("60", cidade.substring(0, 15)) +
    "62070503***";

  const finalPayload = payload + "6304";
  const checksum = crc16(finalPayload);

  return finalPayload + checksum;
}