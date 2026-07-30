# Solana Playground

A learn-by-doing Solana development workspace with an AI tutor, editable
programs, guided tutorials, in-browser builds, Surfpool deployment, generated
IDL controls, and transaction Explorer links.

Try the deployed app at
[solana-learning-playground.vercel.app](https://solana-learning-playground.vercel.app).

## What is included

- Three beginner examples and three tutorials available immediately.
- A searchable New menu containing tutorials, focused examples, production
  program references, and a blank starter.
- Program Pal, an AI tutor that explains code and compiler output, proposes
  reviewable edits, and teaches the build → deploy → interact loop.
- Persistent browser workspaces, conversations, imports, layout, wallet, and
  background job state.
- Built-in Surfpool support plus a saved custom-RPC option.
- IDL-driven interaction controls, tests, verbose output, and Explorer links.
- The original Solana Playground IDE at `/ide`.

## Run locally

Prerequisites:

- Node.js 22
- Yarn 1
- Rust and Cargo
- MongoDB

Clone with the public assets submodule:

```sh
git clone --recurse-submodules https://github.com/catmcgee/solana-learning-playground.git
cd solana-learning-playground
```

Start the API:

```sh
cp .env.example server/.env
cd server
cargo run
```

In a second terminal, start the client:

```sh
cd client
yarn install
REACT_APP_SERVER_URL=http://localhost:8080 yarn start
```

To enable Program Pal, put a fresh OpenAI API key in `server/.env` as
`PG_OPENAI_API_KEY` and replace `PG_LEARNING_SESSION_SECRET` with a long random
value. Never place the OpenAI key in a `REACT_APP_*` variable.

## Validate

```sh
cd client
yarn test-types
yarn test-unit
yarn build
```

The learning examples are adapted from the Solana Foundation
[`program-examples`](https://github.com/solana-foundation/program-examples)
repository.

## License

The repository retains the original Solana Playground licensing: public
libraries are under Apache-2.0 and the remaining project is under GPL-3.0. See
`LICENSE-APACHE` and `LICENSE-GPL`.
