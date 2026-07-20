import {
  google,
} from "googleapis";

import type {
  MetaSheetConfig,
} from "./config";

export function createMetaSheetClient(
  config: MetaSheetConfig
) {
  const auth =
    new google.auth.JWT({
      email:
        config.clientEmail,

      key:
        config.privateKey,

      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ],
    });

  return google.sheets({
    version: "v4",
    auth,
  });
}
