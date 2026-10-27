# SYSMOD MicroStories: snippets

The SysML v2 snippets of the [SYSMOD MicroStories](https://mbse4u.com/blog/tag/microstory/), short stories with the SYSMOD Owl that
tell the [SYSMOD](https://mbse4u.com/sysmod/) method step by step. One file per story, named after the story's address
(`the-project.sysml` belongs to `/blog/sysmod-microstory-the-project`).

- Every file is a standalone package that imports the SYSMOD library (`private import SYSMOD::*;`). Check one together with
  the library, e.g. in the [SYSMOD model check](https://mbse4u.com/sysmod/model/).
- The files are the **source** of the snippets in the stories: the website copies them with the library and writes changes
  into the posts. Change a snippet here, not in the blog post.
- The snippets are deliberately small and simplified. The complete example is the Delivery Drone model in `examples/`.
