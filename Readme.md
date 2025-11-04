# docs


We are planning and enhancing this skill @skills/system/. It is not completed. Even the current components implemention needs to be revisited.Here are the part that we need to cover to fully understand the system. Each part of the system should habe a dedicated markdown file, even more if needed.

## A few importants considerations (should be included in the system overview markdown): 

- most project development are runned inside a vscode devcontainer. This is the Dockerfile image for the devcontainer: https://raw.githubusercontent.com/ghostmind-dev/container/refs/heads/main/container/Dockerfile.base . Some project that required native os access are not runned in a devcontainer
- All the github repository for the system are hosted in this organization https://github.com/orgs/ghostmind-dev/repositories
- The config repository https://github.com/ghostmind-dev/configcontains miscellaneous config (for devcontianer init,.gitignore,vscode settings...) We built a series of devcontainer features that work with the main devcontainer and allow to install and config the developement environment. -
- There a 2 specials variable that are set on the devcontainer initialization. $SRC is the root of the project path inside the devcontainer and LOCALHOST_SRC is the root of the project path is the host. LOCALHOST_SRC is required for mounting and allowing hot reloading (example: nodemon,github action act)
- The init repository https://github.com/ghostmind-dev/init contains the initilization script with the devcxontainer. It performs multiple mainternance to set the developement environment (example: login to GCP, install run,login to vault..). It also contains a devcontainer feature that compliments the init script (allowing to enable/disable action)
- The play repository https://github.com/ghostmind-dev/play contains a colleciton of the custom github actions (for now, only use for the deployment)
- We manage secrets via a vault wrapper (in the run command).It access secrets in vault and import/export locally 
- Variable subsituion is enable in the .env file. Normally, we have a .env.base (common across all environement) and one .env for each enviroment (.env.local,.env.prod). Each file is saved in the vault. We can set the extension fo the base secret in the meta.json (so it could be .env.common instead .env.base)

```json
  "containerEnv": {
    "LOCALHOST_SRC": "${localWorkspaceFolder}",
    "SRC": "${containerWorkspaceFolder}"
  }
  ```
    

## Here are the part we need to cover (one markdown per part):

- the system: an overview of the system itself. The AI agent should normally always start by understanding the system before exploring thedocumentation for the others part
- meta.json: One of the core concept of the system. Most of the configuraiton is described in a meta.json. A project can have one to multiple meta.json. For example. a project is normally composed of mulitple app (db,ui,backend...). All config could be set in one meta.json or each app could have its own meta.json. Here are some of the configuration available: tmux,terreform,docker,docker compose, mcp,cloudfloared tunnel... to name a few. The meta.json needs to be fetch at https://raw.githubusercontent.com/ghostmind-dev/run/refs/heads/main/meta/schema.json . In 99% of the request, it should be fetch to get the most updated schema
- run: Another core component of the system. It is a cli tool packed with many utilities that are used during the whole lifecycle of the app, from initialization, to developementt to production deployment. Most of the action require a meta.json configuration. Most of the utilities can be executed via the terminal shell (as cli command) or imported as a deno typescript function. For now, do not go in details for each function. Some part of this skill will be function of this commmand. Basically, most of the part that we will create in this guide require an understand of both the meta.json and the associated function in the run library. The understand of the run should be an genertal overview of its role in the system,. 
- docker: As states in the previous run section, most concept are a combinaison of config and execution. The docker config in the meta.json set: the path of the context app, the path of the dockerfile, the image name which will be accessed by the terraform. The run cli offers tools to build and push image based on the docker config (check @examples). The docker config has not effect on the compose config and vice versa. The compose config is stricly use for development purpose as the docker config is usef for the production deployment
- compose: The compose config in te meta.json set the local development environment. It definees the location of the compose.yaml. The compose.yalm is a standard docker compose file. Since we are running in a devcontainer, mounting is important for enabling hot reloading (otherwise, it doesn't work). That said, we have a few special config that need to be set in order to allow hot reloading. That is where the LOCALHOST_SRC is handy. Here is an exmaple: 

```yaml 
    environment:
      LOCALHOST_SRC: ${LOCALHOST_SRC}
    volumes:
      - ${LOCALHOST_SRC}/ui/app:/app/app`
``
- 