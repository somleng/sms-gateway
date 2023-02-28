const PATTERN = /^id:(?<messageId>[\w-]+)\ssub:(?<sub>\d+)\sdlvrd:(?<dlvrd>\d+).+stat:(?<stat>\w+)/;

class InvalidMessageFormatError extends Error {}
class UnsupportedDeliveryStatusError extends Error {}

class SMPPDeliveryReceipt {
  constructor(params) {
    this.messageId = params.messageId;
    this.status = params.status;
  }

  static parse(message) {
    const matches = message.match(PATTERN);

    if (matches === null) {
      throw new InvalidMessageFormatError("Invalid Delivery Message Format");
    }

    let result = { messageId: matches.groups.messageId };
    if (matches.groups.stat === "DELIVERED" || matches.groups.stat === "DELIVRD") {
      result.status = "delivered";
    } else if (matches.groups.stat === "ENROUTE" || matches.groups.stat === "ENROUTE") {
      result.status = "sent";
    } else if (matches.groups.stat === "UNDELIVERABLE" || matches.groups.stat === "UNDELIV") {
      result.status = "failed";
    } else {
      throw new UnsupportedDeliveryStatusError("Unsupported Delivery Status Error");
    }

    return new SMPPDeliveryReceipt(result);
  }
}

export { SMPPDeliveryReceipt, InvalidMessageFormatError, UnsupportedDeliveryStatusError };
