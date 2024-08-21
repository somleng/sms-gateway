import {
  SMPPDeliveryReceipt,
  InvalidMessageFormatError,
  UnsupportedDeliveryStatusError,
} from "../../../lib/gateways/smpp_delivery_receipt";

describe(SMPPDeliveryReceipt, () => {
  it("parses delivery receipt from Kannel", () => {
    const message =
      "id:5516a151-4970-45b6-b73e-95aefdb11cbf sub:001 dlvrd:001 submit date:2302231414 done date:230223194211 stat:DELIVRD err:000 text:Hello";

    const deliveryReceipt = SMPPDeliveryReceipt.parse(message);

    expect(deliveryReceipt.messageId).toEqual("5516a151-4970-45b6-b73e-95aefdb11cbf");
    expect(deliveryReceipt.status).toEqual("delivered");
  });

  it("parses sent delivery receipt from GoIP", () => {
    const message =
      "id:4791967 sub:0 dlvrd:1 submit date:2302281329 done date:2302281329 stat:ENROUTE err:0 Text:Hello World from out";

    const deliveryReceipt = SMPPDeliveryReceipt.parse(message);

    expect(deliveryReceipt.messageId).toEqual("4791967");
    expect(deliveryReceipt.status).toEqual("sent");
  });

  it("parses failed delivery receipt from GoIP", () => {
    const message =
      "id:88316820 sub:0 dlvrd:0 submit date:2302281324 done date:2302281325 stat:UNDELIV err:500 Text:Hello World from out";

    const deliveryReceipt = SMPPDeliveryReceipt.parse(message);

    expect(deliveryReceipt.messageId).toEqual("88316820");
    expect(deliveryReceipt.status).toEqual("failed");
  });

  it("parses rejected receipt from Kannel", () => {
    const message =
      "id:577e505a-dbd7-46ab-a04c-5a927ffb85b1 sub:001 dlvrd:000 submit date:2408201338 done date:240820093823 stat:REJECTD err:00B text:You";

    const deliveryReceipt = SMPPDeliveryReceipt.parse(message);

    expect(deliveryReceipt.status).toEqual("failed");
  });

  it("handles unsupported message format", () => {
    const message =
      "id:88316820 sub:0 dlvrd:0 submit date:2302281324 done date:2302281325 err:500 Text:Hello World from out";

    expect(() => {
      SMPPDeliveryReceipt.parse(message);
    }).toThrow(InvalidMessageFormatError);
  });

  it("handles unsupported delivery status", () => {
    const message =
      "id:5516a151-4970-45b6-b73e-95aefdb11cbf sub:001 dlvrd:001 submit date:2302231414 done date:230223194211 stat:EXPIRED err:000 text:Hello";

    expect(() => {
      SMPPDeliveryReceipt.parse(message);
    }).toThrow(UnsupportedDeliveryStatusError);
  });
});
