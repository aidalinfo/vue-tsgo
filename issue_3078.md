# Zero downtime deploy

**TheAlexLichter** opened this issue on March 21, 2018 at 15:32
[View on GitHub](https://github.com/nuxt/nuxt/issues/3078)

---

Hey all!

I haven't found a good solution for Nuxt.js zero downtime deployments (I tried using `pm2` but without success in terms of zero downtime deployments).

Has anyone found a good solution and is willing to share it? :thinking:

<!--cmty--><!--cmty_prevent_hook-->
<div align="right"><sub><em>This feature request is available on <a href="https://nuxtjs.cmty.io">Nuxt.js</a> community (<a href="https://nuxtjs.cmty.io/nuxt/nuxt.js/issues/c2662">#c2662</a>)</em></sub></div>

## Comments (37)

---

### Comment 1 by **pi0** on March 21, 2018 at 16:35

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-375008717)

@manniL Honestly the best way of doing this would be to use docker images. But for conditions like PM2 we may have a better option. Here are difficulties:

- For each build, we need to clean up distDir (`.nuxt`). Build artifacts also live in `.nuxt/dist`. We can not change this structure or put something outside of `.nuxt`. Because many users already have nuxt in their projects and just ignoring this directory.
- We can dynamically change `options.distDir` to something unique after each build like `.nuxt/{src_hash}`. This is great but would need some rotation system to remove old builds.
- Nuxt serves `static/` directly too! (Which is outside distDir) So we cannot easily just do `git pull`/`yarn build`/`pm2 restart`.

I've marked this issue as an enhancement to open discussion. But the final solution may be just some smart configuration tricks added to the docs :)

---

### Comment 2 by **TheAlexLichter** on March 21, 2018 at 16:55

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-375016037)

I agree Docker images would be the easiest way dealing with it in the current state. Haven't thought thoroughly about this :thinking:

Of course, a "built-in" possibility for it would be nice. Working with subdirectories and hashed names will likely work very well. The problem with directly serving the `/static`could also be dealt with by copying the content into the served subdirectory as well, couldn't it? :thought_balloon:

---

### Comment 3 by **Diolor** on March 21, 2018 at 20:04

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-375077780)

If anyone cares about a ready dockerfile, here you go:

```DOCKERFILE
FROM node:9.8.0

RUN mkdir /app
WORKDIR /app

COPY . .
COPY EDCFDA3BDEC43106B223F75D708D32EB.txt /app/.nuxt/dist/.well-known/pki-validation

RUN yarn
RUN yarn build

EXPOSE 3000

CMD [ "yarn", "start" ]
```

Check out the 2nd `COPY`. It will render the file under `www.example.com/.well-known/pki-validation`

---

### Comment 4 by **pi0** on March 21, 2018 at 20:58

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-375093378)

@Diolor Thanks for sharing dockerFile. Anyway, this thread is all about non-container environments I think.

> The problem with directly serving the `/static` could also be dealt with by copying the content into the served subdirectory as well.

Both yes and no. It is a good idea (and even possible right now) to copy and change the static directory for each build (with a hash) but I don't think we can use it for everyone. (Or at least is a subject to discuss itself). Some projects have a rather big `/static` directory so it may be just extra work to do the copy.

---

### Comment 5 by **TheAlexLichter** on March 22, 2018 at 00:34

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-375140359)

@pi0 Even with large `/static` folders this shouldn't be a matter of minutes but seconds. Of course, it is extra work, but if it helps with deployment and separation in general, even people with large `/static` folders might be happy about this feature.

Maybe we could try to integrate the extra build step already in @next? :thinking:

---

### Comment 6 by **bovas85** on March 22, 2018 at 08:09

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-375212021)

Why not build in a separate folder and then copy the changed files over to the public folder?
Premise : I use a statically generated site and there's no downtime doing that

---

### Comment 7 by **awronski** on March 22, 2018 at 08:34

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-375217672)

Why not have two nuxt instances.

Just start new one on a separate port and than when it is on you only change proxy address on nginx. The downtime will be zero. The nginx will switch from one to another.

You can even automate nginx to choose the right proxy for you.

---

### Comment 8 by **TheAlexLichter** on March 22, 2018 at 14:01

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-375316403)

@bovas85 When the site is generated statically it is way easier than it is when using SSR. This shouldn't be an issue at all because you can simply swap content :)

@awronski I thought about that too. A server/reverse-proxy agnostic solution (that works with eg Apache as well) would be better though.

---

### Comment 9 by **XanderLuciano** on July 17, 2018 at 05:29

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-405464005)

I've spent the last 6 hours trying to figure this exact issue. I've tried every combination I could think of between `cluster` and `fork` instances, using different directories, symlinking folders and running `reload`. No matter what I was doing, I either couldn't get more than 1 real instance of nuxt running (even with cluster), or trying to reload resulted in in a server crash, but restart worked fine. I think you guys get the point, I tried every possible combination I could think of.

But there was one large mistake I was making. the way I was running `nuxt start` (or more accurately `npm run start`). From what I had seen online, most people were showing a command that looked like:

`pm2 start --name MyAppName npm -- start` or `pm2 start npm -- start` from within the root of your Nuxt project. And while this works, it's not the best way to do this. From what I understand, this is essentially using Node to run npm, which then starts your server, but instead, you want to have Node just start your server directly.

What do I mean by that? Well `npm run start` is the same as running `nuxt start` which is a script that can be located in your `node_modules` folder at `node_modules/nuxt/bin/nuxt-start`.

So, instead of using `npm -- start`, to start the server with pm2 you would instead need to use the `nuxt-start` script in a pm2 `ecosystem` file.

Info: <https://pm2.io/doc/en/runtime/guide/ecosystem-file/>
Config Reference: <https://pm2.io/doc/en/runtime/reference/ecosystem-file/>

in simple terms, just run `pm2 init` at the project root and edit the ecosystem.config.js` file that is created.

You'll want to edit the file like so:

```javascript
module.exports = {
	apps: [
		{
			name: 'MyAppName', // App name that shows in `pm2 ls`
			exec_mode: 'cluster', // enables clustering
			instances: 2, // or max
			cwd: './clientJS', // only if you are using a subdirectory
			script: './node_modules/nuxt/bin/nuxt-start', // The magic key
		},
	],
};
```

So by doing it this way instead, you'll get the correct result!

![image](https://user-images.githubusercontent.com/13877593/42797884-3d103096-8946-11e8-9db6-0965bbeb895a.png)

And that's actually 4 instances, so running `pm2 reload MyAppName` will result in that application properly reloading with zero downtime.

Combine that with the ideas from "capistrano deployment": <http://pm2.keymetrics.io/docs/tutorials/capistrano-like-deployments>

And I've been able to update a subdirectory from github, run the build process, and then update the symlink in my project root to the new version, and run `pm2 reload MyAppName` and it updates with zero deployment downtime.

Gotta give props to this answer on stack overflow that explained how to do this for an express server which I realized would work exactly the same in our circumstances.

Hopefully this helps everyone create a zero downtime deployment process for Nuxt. I couldn't find an single applicable example or tutorial anywhere online yet.

---

### Comment 10 by **bovas85** on July 17, 2018 at 07:28

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-405486800)

That's great, make a blog post about this on Medium. I'll personally clap it to 50 :)

---

### Comment 11 by **TheAlexLichter** on July 17, 2018 at 12:30

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-405565220)

@XanderLuciano Your solution sounds very promising! I'll try it out soon. The only thing I'm worried about is that all instances will suffer from errors while rebuilding nuxt (with `nuxt build`).

---

### Comment 12 by **XanderLuciano** on July 18, 2018 at 01:49

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-405782651)

@bovas85 Clap it up! Fair warning, I'm no writing expert.

<https://medium.com/@vipercodegames/nuxt-deploy-809eda0168fc>

@manniL You could also use a CI/CD service to "pre-build" your website and then automatically upload the fully built site. Or track the build files in git and just clone the pre-built repo also.

---

### Comment 13 by **bovas85** on July 18, 2018 at 05:54

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-405817488)

Done and shared, thanks

---

### Comment 14 by **kgrosvenor** on July 30, 2018 at 18:50

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-408970826)

On dokku its like my site builds, then it builds again, why and isn't it possible to reuse the same files that were built, if you need package.json or anything i can share :)

---

### Comment 15 by **bovas85** on November 08, 2018 at 04:24

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-436869112)

I'd probably do something along the lines of Zeit Now (building a new instance and then aliasing it to the domain after build).

---

### Comment 16 by **zoellner** on January 17, 2019 at 02:58

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-455024556)

Is there some good documentation around that goes into detail what is actually required to run a production server of nuxt?

I'm gathering a few pieces using `create-nuxt-app`

- `server/index.js` main js file to run
- The Google App Engine example seems to suggest that `.nuxt/dist/client` is needed and can be mapped to path `/_nuxt/*`
- Again from Google App Ending example `static` folder has to be accessible at path `/static/*`
- Any other request should be routed to the node server that is started in `server/index`

It looks like I don't need the `assets` folder since the necessary files are in `.nuxt/dist/client` but what parts of the code do I really need?

And an additional question: How do these files relate on each other? Say I deploy a new static `.nuxt/dist/client` folder, is there a requirement that this is deployed before/after the node server is running an updated version?

---

### Comment 17 by **kevinmarrec** on January 30, 2019 at 11:37

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-458913093)

When using `pm2` + `nginx` reverse proxy, there is `502 Bad Gateway` page error for few seconds, even if using 2 cluster instances and `pm2 reload`.

Does anyone succeed to have a true "Zero downtime deployment" ?

EDIT : When running `pm2 reload`, the new version of the app is instantly `online`, so the issue can either be

1. Nuxt makes time to setup when using `nuxt-start` and `pm2` think it's ready but it's not
   OR
2. The issue is around the proxy server

---

### Comment 18 by **alanaasmaa** on January 30, 2019 at 12:28

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-458926370)

@kevinmarrec Are you using cluster mode?
<http://pm2.keymetrics.io/docs/usage/cluster-mode/>

---

### Comment 19 by **kevinmarrec** on January 30, 2019 at 12:35

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-458928145)

@alanaasmaa Yes, but i'm not using `wait_ready` option, and Nuxt doesn't send the `ready` event that PM2 can handle to know when the server is listening.

In my case, I'm using `nuxt-ts`, so there is few more seconds than standard server before listening on port cause it needs to registers `ts-node` to handle TypeScript RunTime.

So here it what's happen :
PM2 switch my 2 instances with a Nuxt app not listening yet, which cause a downtime and make my Nginx server proxy falls into `502 Bad Gateway`, until instances are listening alrightly.

---

### Comment 20 by **kevinmarrec** on January 30, 2019 at 13:05

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-458936306)

`nuxt start` does a bunch of runtime things behinds the scenes such as setuping modules & serverMiddlewares, which can take seconds to maybe minutes depending on your modules setup that can be asynchronously waiting for things.

See : <https://github.com/nuxt/nuxt.js/issues/4797> @dschewchenko proposal
`process.send('ready')` should be called when we're sure Nuxt is ready. `Nuxt being ready` means `Nuxt listening on a port`.

It will be supposed to be used with `pm2` ecosystem file `wait_ready` option, to let `pm2` know it needs to wait for the `ready` event.

---

### Comment 21 by **dschewchenko** on January 30, 2019 at 13:26

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-458942449)

But pm2 has listen_timeout, that by default is 3000ms. For some reasons we need override to greater number, depends on init time
For example:
If no ready event in 3s it will automatically reload process, else it will reload earlier

---

### Comment 22 by **curtisbelt** on January 30, 2019 at 13:57

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-458952688)

@kevinmarrec I have this repo I created to give a working example of pm2 zero downtime deployments using a capistrano-like symlink deployment: <https://github.com/CurtisBelt/pm2-nuxt-blue-green-deploy>

In that repo, the deployment steps are:

1. Run `yarn install && yarn build`
2. Switch `current` symlink to point to new files
3. (at this point, the old files are still in-memory running in pm2)
4. Reload PM2 (rolling instance deploy)

Just making sure I understand the problem -- I've not used typescript but I thought that would be compiled during build (step 1)? You're saying reloading the instance itself (step 4) takes several seconds per instance?

Regardless, I agree it would be better to use `wait_ready` like you mentioned. If someone solves this, I will have to update my repo! :smiley:

---

### Comment 23 by **dschewchenko** on January 30, 2019 at 14:03

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-458954692)

@CurtisBelt I have the same issue, because I have module that connects to DB and extends nuxt with some additional logic and params. Start of one instance takes a long time(3-10 seconds), depends on inner connection and other reasons

---

### Comment 24 by **kevinmarrec** on January 30, 2019 at 14:11

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-458957571)

@dschewchenko Yep, people can set it to 10s or 20s depending on their needs.

@CurtisBelt Yeah I already've seen your repo but I think you're "only" resolving the need of versioning through symlinks (nice work btw !). I mean for minimal Nuxt apps without modules that instantly start, you can't feel the downtime I guess. But as @dschewchenko said, things like DB connections are average to expensive tasks that can make your Nuxt app slow to start.

So we need to make Nuxt `wait_ready` compatible :)

Build step is Webpack build, runtime things like configuration, modules, serverMiddlewares are not built but executed at runtime when running the Nuxt app for the first time. (`typescript` app needs more time as it needs to register `ts-node` at first execution of the app).

---

### Comment 25 by **curtisbelt** on January 30, 2019 at 14:51

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-458971797)

Spoke to @kevinmarrec in Discord before seeing the responses here! To quickly recap our discussion, yeah my repo doesn't solve this issue, I didn't realize it as my nuxt apps started fast enough to be "instant".

---

### Comment 26 by **rchl** on March 28, 2019 at 08:35

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-477499483)

Using docker images doesn't really fix anything magically.

Imagine situation with deployment of amazon ec2 instances (so live, non-static nuxt instances).

- Let's say we have live cluster with one instance of nuxt running. No problems here.
- We start deploying new instance whose `/_nuxt/dist/client/*` contents differs (different hashed file names)
- As an example, let's say "old" instance has files:

```
/_nuxt/dist/client/:
 * aaa.js
 * bbb.js
```

and "new" instance has files:

```
/_nuxt/dist/client/:
 * xxx.js
 * yyy.js
```

- During deployment there is a time frame of maybe 6 mins when both servers are live and serving content.
- During that period user requests page and gets connected (randomly) to the "old" server that serves index page that references files `aaa.js` and `bbb.js`.
- Browser requests both files.
- First request happens to be routed to "old" server so we get OK response but second request happens to be routed to "new" server that doesn't have `bbb.js` file and we get 404 response.
- App breaks

This problem can be mitigated a bit by copying over "old" generated files to "new" package on building but that will only help in some of the cases as "new" server will have "new" and "old" files but "old" server will only have "old" files still.

---

### Comment 27 by **kgrosvenor** on March 28, 2019 at 08:52

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-477504679)

Is it possible to have nuxt build in another step, then we can just npm run start and it boots instantly, this was the biggest down fall of nuxt js for me, it does a lot of waiting and building all though I already ran npm run build in previous step

There is always breif downtime between the new site deploying, however I do have a nice gitlab Ci handling all this, nuxt could be more optimised in this area so we can pre compute all the modules and statically save them

---

### Comment 28 by **rchl** on March 28, 2019 at 09:11

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-477510819)

> Is it possible to have nuxt build in another step,

You can `nuxt build` and `nuxt start` in two separate steps. It's already possible and working.

> There is always breif downtime between the new site deploying

Couple of seconds would be acceptable but with typical (amazon) deployment that is waiting for healthchecks and stuff, it's about 6 mins (for us) and it's way too much.
But I would say that's more of a fundamental issue with that type of deployment and not sure anything nuxt can do about.

---

### Comment 29 by **rchl** on March 28, 2019 at 13:33

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-477596484)

BTW. For[my case,](https://github.com/nuxt/nuxt.js/issues/3078#issuecomment-477499483) with amazon instances, I have found one solution that appears to work (haven't tested extensively yet). We have cloudfront set up in front where we configured `/_nuxt/*` to be served from s3 bucket. On deployment, we add all new files from `/.nuxt/dist/client/` there so that we always have all build files available in case user requests one that is not available in latest deployment.

---

### Comment 30 by **rohit-gohri** on March 23, 2020 at 06:27

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-602410140)

If anyone is trying this with the latest nuxt. The bin file has moved. It's `node_modules/@nuxt/cli/bin/nuxt-cli.js` now. And you have to provide the `start` argument.

```js
module.exports = {
	// Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
	apps: [
		{
			name: 'app',
			script: 'node_modules/@nuxt/cli/bin/nuxt-cli.js',
			args: ['start'],
			instances: 0, // 0 for max, specify some number for limiting
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			env: {
				NODE_ENV: 'development',
			},
			env_production: {
				NODE_ENV: 'production',
			},
		},
	],
};
```

---

### Comment 31 by **dweldon** on October 21, 2020 at 04:04

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-713285283)

In my SPA app, just building to a different directory and then replacing `.nuxt` with the new version seems to work.

First I added the following line to my `nuxt.config.js`:

`buildDir: '.nuxt'`

Note my `package.json` has the following build script:

`"build": "nuxt build"`

Then I added this script (build.sh) to build and swap the directories:

```bash
#!/bin/bash

# Rename the build directory
sed -i "s/buildDir: '.nuxt'/buildDir: 'new-hotness'/" nuxt.config.js

# Build the app
npm run build

# Revert the rename
git checkout nuxt.config.js

# Replace the existing directory with the new build
rm -rf .nuxt && mv new-hotness .nuxt
```

After the build process completes, I just restart my `nuxt start --spa` process. I hope that helps someone.

---

### Comment 32 by **nickdawes** on December 02, 2021 at 16:24

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-984785878)

> In my SPA app, just building to a different directory and then replacing `.nuxt` with the new version seems to work.
>
> First I added the following line to my `nuxt.config.js`:
>
> `buildDir: '.nuxt'`
>
> Note my `package.json` has the following build script:
>
> `"build": "nuxt build"`
>
> Then I added this script (build.sh) to build and swap the directories:
>
> ```shell
> #!/bin/bash
>
> # Rename the build directory
> sed -i "s/buildDir: '.nuxt'/buildDir: 'new-hotness'/" nuxt.config.js
>
> # Build the app
> npm run build
>
> # Revert the rename
> git checkout nuxt.config.js
>
> # Replace the existing directory with the new build
> rm -rf .nuxt && mv new-hotness .nuxt
> ```
>
> After the build process completes, I just restart my `nuxt start --spa` process. I hope that helps someone.

Hey @dweldon , thanks for this- I've tried it out, and seem to have ran into an issue. I was wondering if I'd missed a step or maybe my understanding is a little off.

If I'm browsing in SPA mode while the app is being rebuilt, and I trigger a request for additional files- these files no longer exist on the server as they were rebuilt and renamed (filename is rehashed). So I end up getting a bunch of 404s.

Is this something you were able to solve with your approach?

---

### Comment 33 by **dweldon** on December 02, 2021 at 16:38

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-984798301)

@nickdawes Yeah that's a good point. I failed to mention I have nginx in front of the server so the old files are cached. Offhand I'm not certain what happens if the user just leaves the browser open forever. I seem to remember testing this and it picked up the new code after a route change... but it's been a long time since I looked at it.

---

### Comment 34 by **rocksfrow** on September 21, 2022 at 23:35

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-1254337370)

I wanted to thank @rchl for sharing their cloudfront solution and share my like-minded solution w efs. @nickdawes also explained the problem well.

We were running into the same issue with rehashed files going missing during instance refreshes, and the issue gets worse as instance count rises on your auto scaling groups.

We ended up modifying our release build/deploy process to keep the current and previous builds \_nuxt directory on an EFS mount. We’re fetching our nuxt files via a laravel backend controller so we just modified our controller to hot load missing files from the EFS mount before 404ing. We also copy the files from EFS to local to satisfy future requests without hitting EFS until refreshes are complete.

Zero downtime!

---

### Comment 35 by **lightningnetworkstores** on January 30, 2023 at 15:34

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-1408839117)

this issue should be open IMO

---

### Comment 36 by **MLouis** on August 21, 2023 at 14:48

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-1686476990)

> In my SPA app, just building to a different directory and then replacing `.nuxt` with the new version seems to work.
>
> First I added the following line to my `nuxt.config.js`:
>
> `buildDir: '.nuxt'`
>
> Note my `package.json` has the following build script:
>
> `"build": "nuxt build"`
>
> Then I added this script (build.sh) to build and swap the directories:
>
> ```shell
> #!/bin/bash
>
> # Rename the build directory
> sed -i "s/buildDir: '.nuxt'/buildDir: 'new-hotness'/" nuxt.config.js
>
> # Build the app
> npm run build
>
> # Revert the rename
> git checkout nuxt.config.js
>
> # Replace the existing directory with the new build
> rm -rf .nuxt && mv new-hotness .nuxt
> ```
>
> After the build process completes, I just restart my `nuxt start --spa` process. I hope that helps someone.

I used your script in my SSR app and it worked well until I served images with IPX. To fix this I just added this line in the script before the last command:

```shell
# Rename the build directory in new-hotness/dist/nuxtrc used by ipx
sed -i "s/serverMiddleware.0.handler=~~\/new-hotness\/dist\/api\/ipx.js/serverMiddleware.0.handler=~~\/.nuxt\/dist\/api\/ipx.js/" new-hotness/dist/nuxtrc
```

Whole script `build.sh`:

```shell
#!/bin/bash

# Rename the build directory
sed -i "s/buildDir: '.nuxt'/buildDir: 'new-hotness'/" nuxt.config.js

# Build the app
npm run build

# Revert the rename
git checkout nuxt.config.js

# Rename the build directory in new-hotness/dist/nuxtrc used by ipx
sed -i "s/serverMiddleware.0.handler=~~\/new-hotness\/dist\/api\/ipx.js/serverMiddleware.0.handler=~~\/.nuxt\/dist\/api\/ipx.js/" new-hotness/dist/nuxtrc

# Replace the existing directory with the new build
rm -rf .nuxt && mv new-hotness .nuxt
```

---

### Comment 37 by **antonreshetov** on July 15, 2024 at 12:14

[Link](https://github.com/nuxt/nuxt/issues/3078#issuecomment-2228361201)

After all, it will not solve the problem when the user is already using the site, his browser cached statics, and after deployment he initiates some action that loads a certain chunk, which is no longer there.

Is there any solution to this problem?
