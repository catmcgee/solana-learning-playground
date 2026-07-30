import type { TupleFiles } from "../utils";

export type LearningExample = {
  id: "hello-solana" | "account-data" | "counter";
  order: number;
  title: string;
  eyebrow: string;
  description: string;
  concepts: string[];
  workspaceName: string;
  sourceUrl: string;
  files: TupleFiles;
  prompt: string;
  experiment: {
    title: string;
    description: string;
    prompt: string;
  };
};

const SOURCE_COMMIT = "e55d2e6b8580b1488a06df8920d939f5bd60942d";
const SOURCE_ROOT = `https://github.com/solana-foundation/program-examples/tree/${SOURCE_COMMIT}/basics`;

export const LEARNING_EXAMPLES: LearningExample[] = [
  {
    id: "hello-solana",
    order: 1,
    title: "Hello, Solana",
    eyebrow: "Make the chain speak",
    description:
      "Deploy the smallest useful Anchor program and read its message from transaction logs.",
    concepts: ["program", "instruction", "logs"],
    workspaceName: "learn-hello-solana",
    sourceUrl: `${SOURCE_ROOT}/hello-solana/anchor`,
    prompt:
      "Walk me through this Hello Solana program. Start with what runs onchain, then help me build, deploy, and call hello on Surfpool.",
    experiment: {
      title: "Make it greet you",
      description:
        "Give hello a name argument and include it in the onchain log.",
      prompt:
        "Show me how to change hello so it accepts a name and logs a personal greeting. Propose the patch and explain each changed line.",
    },
    files: [
      [
        "src/lib.rs",
        `use anchor_lang::prelude::*;

// Playground replaces this with your generated program address when you build.
declare_id!("11111111111111111111111111111111");

#[program]
pub mod hello_solana {
    use super::*;

    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, Solana!");
        msg!("Our program's Program ID: {}", &id());
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Hello {}
`,
      ],
      [
        "tests/hello.test.ts",
        `describe("Hello Solana", () => {
  it("writes a greeting to the transaction logs", async () => {
    const signature = await pg.program.methods.hello().rpc();
    await pg.connection.confirmTransaction(signature);
    console.log("Greeting transaction:", signature);
  });
});
`,
      ],
    ],
  },
  {
    id: "account-data",
    order: 2,
    title: "Account Data",
    eyebrow: "Give the program a memory",
    description:
      "Create an account, write structured data into it, and fetch that state back from Surfpool.",
    concepts: ["accounts", "space", "serialization"],
    workspaceName: "learn-account-data",
    sourceUrl: `${SOURCE_ROOT}/account-data/anchor`,
    prompt:
      "Teach me how this program stores data in a Solana account. Then help me build it and create one address-info account on Surfpool.",
    experiment: {
      title: "Add one more field",
      description:
        "Store a short note and see why account space must be planned up front.",
      prompt:
        "Propose a patch that adds a short note field to AddressInfo. Explain max_len, serialization, and how the account's required space changes.",
    },
    files: [
      [
        "src/lib.rs",
        `use anchor_lang::prelude::*;
use instructions::*;

pub mod constants;
pub mod instructions;
pub mod state;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod account_data_anchor_program {
    use super::*;

    pub fn create_address_info(
        ctx: Context<CreateAddressInfo>,
        name: String,
        house_number: u8,
        street: String,
        city: String,
    ) -> Result<()> {
        create::create_address_info(ctx, name, house_number, street, city)
    }
}
`,
      ],
      ["src/constants.rs", "pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;\n"],
      [
        "src/instructions/mod.rs",
        `pub mod create;
pub use create::*;
`,
      ],
      [
        "src/instructions/create.rs",
        `use crate::{constants::ANCHOR_DISCRIMINATOR_SIZE, state::AddressInfo};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreateAddressInfo<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = ANCHOR_DISCRIMINATOR_SIZE + AddressInfo::INIT_SPACE,
    )]
    pub address_info: Account<'info, AddressInfo>,
    pub system_program: Program<'info, System>,
}

pub fn create_address_info(
    ctx: Context<CreateAddressInfo>,
    name: String,
    house_number: u8,
    street: String,
    city: String,
) -> Result<()> {
    *ctx.accounts.address_info = AddressInfo {
        name,
        house_number,
        street,
        city,
    };
    Ok(())
}
`,
      ],
      [
        "src/state/mod.rs",
        `pub mod address_info;
pub use address_info::*;
`,
      ],
      [
        "src/state/address_info.rs",
        `use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AddressInfo {
    #[max_len(50)]
    pub name: String,
    pub house_number: u8,
    #[max_len(50)]
    pub street: String,
    #[max_len(50)]
    pub city: String,
}
`,
      ],
      [
        "tests/account-data.test.ts",
        `describe("Account Data", () => {
  const addressInfo = new web3.Keypair();

  it("creates and reads an address-info account", async () => {
    await pg.program.methods
      .createAddressInfo("Joe C", 136, "Mile High Dr.", "Solana Beach")
      .accounts({
        addressInfo: addressInfo.publicKey,
        payer: pg.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([addressInfo])
      .rpc();

    const stored = await pg.program.account.addressInfo.fetch(
      addressInfo.publicKey
    );
    console.log("Stored address:", stored);
  });
});
`,
      ],
    ],
  },
  {
    id: "counter",
    order: 3,
    title: "Counter",
    eyebrow: "Change state over time",
    description:
      "Initialize a counter account, mutate it with instructions, and watch the state change transaction by transaction.",
    concepts: ["mutable state", "signers", "checked math"],
    workspaceName: "learn-counter",
    sourceUrl: `${SOURCE_ROOT}/counter/anchor`,
    prompt:
      "Explain how initialize_counter and increment work together. Help me deploy this counter to Surfpool and watch its value change.",
    experiment: {
      title: "Add a decrement button",
      description:
        "Introduce a second state transition and handle the zero boundary safely.",
      prompt:
        "Propose a decrement instruction for this counter. Prevent underflow, explain the error path, and include the matching test.",
    },
    files: [
      [
        "src/lib.rs",
        `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod counter_anchor {
    use super::*;

    pub fn initialize_counter(_ctx: Context<InitializeCounter>) -> Result<()> {
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        ctx.accounts.counter.count =
            ctx.accounts.counter.count
                .checked_add(1)
                .ok_or(CounterError::Overflow)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCounter<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init, space = 8 + Counter::INIT_SPACE, payer = payer)]
    pub counter: Account<'info, Counter>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
}

#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub count: u64,
}

#[error_code]
pub enum CounterError {
    #[msg("The counter cannot be incremented beyond u64::MAX.")]
    Overflow,
}
`,
      ],
      [
        "tests/counter.test.ts",
        `describe("Counter", () => {
  const counter = new web3.Keypair();

  it("initializes and increments", async () => {
    await pg.program.methods
      .initializeCounter()
      .accounts({
        payer: pg.wallet.publicKey,
        counter: counter.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([counter])
      .rpc();

    await pg.program.methods
      .increment()
      .accounts({ counter: counter.publicKey })
      .rpc();

    const stored = await pg.program.account.counter.fetch(counter.publicKey);
    assert(stored.count.eq(new BN(1)));
  });
});
`,
      ],
    ],
  },
];

export const getLearningExample = (id: LearningExample["id"]) =>
  LEARNING_EXAMPLES.find((example) => example.id === id) ??
  LEARNING_EXAMPLES[0];
