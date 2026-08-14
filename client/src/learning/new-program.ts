export const NEW_PROGRAM_FILES: Array<[string, string]> = [
  [
    "src/lib.rs",
    `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod my_program {
    use super::*;

    pub fn start(_ctx: Context<Start>) -> Result<()> {
        msg!("My first instruction ran!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Start {}
`,
  ],
  [
    "tests/start.test.ts",
    `describe("My program", () => {
  it("runs the starter instruction", async () => {
    const signature = await pg.program.methods.start().rpc();
    console.log("Transaction:", signature);
  });
});
`,
  ],
];
