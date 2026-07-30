import { GITHUB_URL } from "../../constants";
import { PgCommon } from "../../utils";
import { createSetting } from "../create";

export const server = [
  createSetting({
    id: "server.endpoint",
    description: "Build server URL",
    values: [
      { name: "Local", value: "http://localhost:8080" },
      { name: "SolPg", value: "https://api.solpg.io" },
    ],
    default:
      // Treat an empty environment variable as unset. Vercel can expose
      // optional values as an empty string during static generation.
      process.env.REACT_APP_SERVER_URL?.trim() ||
      "https://solana-learning-playground-api-597771376676.us-central1.run.app",
    custom: {
      parse: (v) => {
        if (PgCommon.isUrl(v)) return v;
        throw new Error(`The setting value must be a URL: ${v}`);
      },
      type: "URL",
      placeholder: "https://...",
      tip: `Make sure the endpoint runs [the playground server](${GITHUB_URL}/tree/master/server).`,
    },
  }),
];
