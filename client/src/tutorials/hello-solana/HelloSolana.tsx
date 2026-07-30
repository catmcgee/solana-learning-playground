import { Tutorial } from "../../components/Tutorial";
import { PgExplorer, PgView } from "../../utils";

const HelloSolana = () => (
  <Tutorial
    // About section that will be shown under the description of the tutorial page
    about={require("./about.raw")}
    // Actual tutorial pages to show next to the editor
    pages={[
      { content: require("./pages/1.raw"), title: "Program" },
      {
        content: require("./pages/2.raw"),
        title: "Build & Deploy",
        onMount: () => (PgView.sidebar.name = "Build & Deploy"),
      },
      {
        content: require("./pages/3.raw"),
        title: "Client",
        onMount: async () => {
          // Switch sidebar page to Explorer
          PgView.sidebar.name = "Explorer";

          // Create client.ts file
          const clientPath = "client/client.ts";
          const clientExists = await PgExplorer.fs.exists(clientPath);
          if (!clientExists) {
            await PgExplorer.createItem(
              clientPath,
              require("./files/client.ts.raw")
            );
          }
        },
      },
    ]}
    // Initial files to have at the beginning of the tutorial
    files={[["src/lib.rs", require("./files/lib.rs")]]}
  />
);

export default HelloSolana;
