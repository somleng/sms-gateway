const PATTERN = /^id:(?<messageId>[\w-]+)\ssub:(?<sub>\d+)\sdlvrd:(?<dlvrd>\d+).+stat:(?<stat>\w+)/;

class InvalidMessageError extends Error {}

class SMPPDeliveryReceipt {
  constructor(params) {
    this.messageId = params.messageId;
    this.status = params.status;
  }

  static parse(message) {
    const matches = message.match(PATTERN);

    if (matches === null) {
      throw new InvalidMessageError();
    }

    let result = { messageId: matches.groups.messageId };
    if (matches.groups.stat === "DELIVERED" || matches.groups.stat === "DELIVRD") {
      result.status = "delivered";
    } else if (matches.groups.stat === "ENROUTE" || matches.groups.stat === "ENROUTE") {
      result.status = "sent";
    } else if (matches.groups.stat === "UNDELIVERABLE" || matches.groups.stat === "UNDELIV") {
      result.status = "failed";
    }

    return new SMPPDeliveryReceipt(result);
  }
}

export { SMPPDeliveryReceipt, InvalidMessageError };
