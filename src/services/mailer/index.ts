import config from "config";
import { isEqual, isNil } from "lodash";
import { send as CourierSend } from "./courier";
import { send as NodemailerSend } from "./nodemailer";
import { PartialConfigError } from "lib/PartialConfigError";

export const send = async (email: string, template: string, data?: object) => {
  // Check whether email verification is enabled
  if (isEqual(config.polygon?.emailEnableVerification, true)) {
    // Frontend URL is not supplied
    if (isNil(config.polygon?.frontendUrl))
      throw new PartialConfigError("`polygon.frontendUrl`");
    else {
      // Courier was set as the default email provider
      if (isEqual(config.email?.client, "courier")) {
        const response = await CourierSend(email, template, data);
        return response;
      } else {
        const response = await NodemailerSend(email, template, data);
        return response;
      }
    }
  } else throw new PartialConfigError("`polygon.emailEnableVerification`");
};
