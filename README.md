# neogen

![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/fulcanelly/neogen/test.yml)
![NPM](https://img.shields.io/npm/l/neogen)

# What is neogen?

neogen is a code generation tool for `neogma`, focused on automating and streamlining the development of Neo4j object-graph mappings (OGMs). It facilitates efficient model generation, relationship setup, and method creation, while ensuring type safety in Neo4j-based projects.

## Motivation

Developed with inspiration from Ruby on Rails' `rails g`, neogen eliminates the repetitive and error-prone aspects of manual Neo4j OGM setup in `neogma`. Its primary goal is to enhance development efficiency and accuracy in managing Neo4j database schemas and relationships.


## How to use

#### Installing

```shell
yarn add neogen
```

#### Create config file

```shell
touch neogen.config.ts

```

### Update your connection

At this point assuming your project' structure to be like this
```
├── neogen.config.ts
├── package.json
└── src
    ├── index.ts
    ├── neo4j.ts
    └── models
```

Where `neo4j.ts` contains instance of `Neogma` connection:

It's required to add this lines so that neogen could find connection, since models depend on it's value

```typescript
import { neogen } from "neogen";
// ...
const neogma = new Neogma(...
// ...
neogen.setInstance(neogma)

```

#### Write desired schema:

Update `neogen.config.ts` file:

```typescript
import { neogen } from "neogen";

neogen.generateAll({ // settings
    generateBase: true,
    outputFolder: './src/models'
}, [{ // models
    label: 'Post',
    schema: {
        uuid: 'string',
        text: 'string'
    }
}, {
    label: 'User',
    schema: {
        name: 'string',
        uuid: 'string',
        online: 'boolean'
    }
}], { // relations
    POST_POSTED_BY: {
        User: 'posted',
        Post: 'of_user',
    },
    POST_LIKED_BY: {
        User: 'likes',
        Post: 'liked_by'
    },
})
```

#### Adjust your `package.json`

```json
"scripts": {
    "neogen": "ts-node neogen.config.ts",
```

And finally run

```shell
yarn run neogen
```

### Result

With this configuration it'll generate 6 files

```
├── neogen.config.ts
├── package.json
└── src
    └── models
        ├── __base.ts
        ├── __relations.ts
        ├── post.ts
        ├── post_.ts
        ├── user.ts
        └── user_.ts

```

- `post`, `user` - the ones containing all type and meta information
- `post_` and `user_` - contains static and instance methods of the models
- `__relations` - contains all relations defenitions, it's important to import it in main file
- `__base` - contains base of instance and statics methods if `generateBase` option is enabled

### Update your main file

It's important to import it in this order in your main/index file before using any models:

```ts
import './neo4j' // or whatever your file with neo4j connection is named
import './models/__relations'
```


## TODO
- Core
     - [ ] Validate relations
     - [x] Auto instance import
     - [ ] Relation getters
- Organizational
     - [ ] Eslint
     - [x] Use Github workflow for publishing npm
     - [x] Add tests
