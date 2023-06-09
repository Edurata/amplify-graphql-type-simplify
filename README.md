# @edurata/amplify-graphql-type-simplify

Converts Graphql queries and mutations generated by AWS Amplify to a ready-to-use fully-typed function SDK.

---

## Sample SDK usage

Lists all available queries and mutations

![image](https://user-images.githubusercontent.com/3125784/226389598-3a7b0d44-3541-45de-a765-3c517df8413e.png)

Auto detects variables associated to selected query/mutation

![image](https://user-images.githubusercontent.com/3125784/226390045-c930ec8a-2d5b-4075-b42e-ee94b6a69354.png)

---

## Setup

This tool requires a working [AWS Amplify](https://docs.amplify.aws/) project using typescript. There should be a `.graphqlconfig.yml` file in root directory.

```yml
projects:
  edurata:
    schemaPath: /src/graphql/schema.json
    includes:
      - src/graphql/**/*.ts
    excludes:
      - ./amplify/**
    extensions:
      amplify:
        codeGenTarget: typescript
        generatedFileName: src/graphql/api.ts
        docsFilePath: src/graphql
        region: us-west-1
        apiId: null
        maxDepth: 4
      ## Add this additional extension
      apiRequest:
        generatedFileName: src/graphql/apiRequest.ts
    ## ##
extensions:
  amplify:
    version: 3
```

To generate SDK file, run this in amplify root directory:

```bash
amplify api gql-compile && amplify codegen && npx @edurata/amplify-graphql-type-simplify --yes
```

---

Setup for Amplify Graphql API

```jsx
import { API, graphqlOperation } from "aws-amplify";
import { setHandler } from "graphql/apiRequest"; // generate apiRequest sdk

export default function configureAppSyncRequest() {
  setHandler(async (query, variables) => {
    try {
      const response = await API.graphql(graphqlOperation(query, variables));
      return response;
    } catch (err) {
      return { errors: [err] };
    }
  });
}
```
