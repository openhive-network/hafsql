# HafSQL
This version is compatible with latest HAF

## Documentation
- [SQL Documentations](https://mahdiyari.gitlab.io/hafsql/)
- - Public HafSQL node information is in the above documentation
- API Documentations: [hafsql-api](https://hafsql-api.mahdiyari.info) - Any node running HafSQL will serve them
- - The above URL is also an API endpoint
- [Docker compose yaml files](https://gitlab.com/mahdiyari/haf_dockers)

***
## Running  
HafSQL now runs alongside HAF and other HAF apps in the official haf_api_node stack  

## Development
- APIs are located in `/src/api/routes`  
- New APIs must be imported in `/src/api/mod.ts`  
- API documentation UI is in `/src/api/ui/scalar.ts`  
- SQL views are located in `/src/app/setup/extra_views.ts` and `setup_operation_views.ts`  
- SQL functions are in `/src/app/setup/functions.ts`  
- Breaking schema changes must be handled in `src/upgrade.ts`  
- Version must be updated in `deno.json`  
- Docker images are built, tagged, and pushed with `./docker-push.sh` (requires `docker login`)  
- SQL docs are built by gitlab - just edit md files in `sql_docs`  
  
Open issues for feedback or requests.
