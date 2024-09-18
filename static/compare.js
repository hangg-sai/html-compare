(function (factory) {
  //namespacing
  if (!window["Compare"]) {
    window["Compare"] = {};
  }
  factory(window["Compare"]);
})(function (Compare) {
  //namespace Compare

  /*** Global comparator ***/

  /* setup all elements of class compare */
  function setup_comparators() {
    var comparators = document.querySelectorAll(".compare");
    for (var comparator of comparators) {
      var videos = [...comparator.querySelectorAll("video")];
      wait_for_videos(videos, comparator, setup_comparator);
    }
  }

  /* wait for video metadata to be ready so that their size is known */
  function wait_for_videos(videos, comparator, action) {
    //ensure that every video is handled
    if (videos.length > 0) {
      if (videos[0].readyState < 1) {
        //the video is still not available, add hook
        videos[0].addEventListener("loadedmetadata", function (e) {
          wait_for_videos(videos.slice(1), comparator, action);
        });
      } else {
        //the video is ready, proceed to the remaining ones
        wait_for_videos(videos.slice(1), comparator, action);
      }
      //manual autoplay
      if (videos[0].readyState < 4) {
        //not enough data is available, add a play trigger when available
        videos[0].addEventListener("canplay", function (e) {
          e.currentTarget.play();
        });
      } else {
        //sufficient data is available, play
        videos[0].play();
      }
    } else {
      //all videos are ready, proceed to setup
      action(comparator);
    }
  }

  /* setup a comparator element */
  function setup_comparator(comparator) {
    //get compared element
    var compared = comparator.querySelectorAll(".compared");
    if (compared.length == 0) {
      console.error("comparator contains no compared element");
      return;
    }

    //size
    var w = compared[0].videoWidth || compared[0].naturalWidth;
    var h = compared[0].videoHeight || compared[0].naturalHeight;
    if (!w || !h) {
      console.error("Unable to determine the size of the compared element");
      return;
    }

    sources = [];
    if (compared.length == 2) {
      //two compared elements, one should be left, the other one right
      var left = comparator.querySelector(".compared-left");
      var right = comparator.querySelector(".compared-right");
      if (left && right) {
        sources.push({
          elt: left,
          label: left.dataset.compare,
          x: 0,
          y: 0,
        });
        sources.push({
          elt: right,
          label: right.dataset.compare,
          x: 0,
          y: 0,
        });
      } else {
        console.error(
          "comparator must contain a compared-left and a compared-right child",
        );
        return;
      }
    } else {
      console.error("comparison not handled for more than two elements");
      return;
    }

    //Setup the div width according to the content
    comparator.style.width = w + "px";

    //setup visible canvas
    var canvas = document.createElement("canvas");
    comparator.appendChild(canvas);
    canvas.width = w;
    canvas.height = h;

    //setup context
    var context = {
      canvas: canvas,
      sources: sources,
      x: w / 2,
      y: h / 2,
      zoom: 4,
      speed: 1,
    };

    //setup settings
    create_settings(comparator, context);

    //move split with the mouse
    comparator.addEventListener("mousemove", function (e) {
      //mouse position relative to the canvas
      var rect = context.canvas.getBoundingClientRect();
      var x = e.clientX - rect.x;
      var y = e.clientY - rect.y;

      if (
        !(
          x < 0 ||
          x > context.canvas.width ||
          y < 0 ||
          y > context.canvas.height
        )
      ) {
        // the mouse in is the canvas, update split position
        setTimeout(move_split, 0, context, x, y);
      }
    });

    //splatting
    if (
      sources[0].elt.nodeName == "VIDEO" ||
      sources[1].elt.nodeName == "VIDEO"
    ) {
      //for videos schedule regular splatting
      setInterval(transfer_compare, 40, context);
    } else {
      //for images splat once, update handled by mouseover
      setTimeout(transfer_compare, 0, context);
    }
  }

  /* move the split to a given relative position */
  function move_split(context, x, y) {
    //position relative to the canvas
    context.x = x;
    context.y = y;

    //request redraw
    setTimeout(transfer_compare, 0, context);
  }

  /* splatting on the canvas */
  function transfer_compare(context) {
    //context information
    var ctx = context.canvas.getContext("2d");
    var w = context.canvas.width;
    var h = context.canvas.height;
    var s = context.sources;

    //splat first image on the whole canvas
    ctx.drawImage(s[0].elt, s[0].x, s[0].y, w, h, 0, 0, w, h);

    //separator color
    ctx.strokeStyle = "#FF0000";

    //splat the second image
    var x = Math.min(Math.max(1, context.x), w - 1);

    //split sides
    ctx.drawImage(s[1].elt, s[1].x + x, s[1].y, w - x, h, x, 0, w - x, h);

    //separator
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();

    //put labels
    var tx = ctx.measureText(s[0].label).width;
    var ty = ctx.measureText(s[0].label).width;
    ctx.font = "50px sans-serif";
    ctx.fillStyle = "white";
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, 10 + tx + 10, 10 + ty + 10);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "black";
    ctx.fillText(s[0].label, 10, 10 + ty);
    var tx = ctx.measureText(s[1].label).width;
    var ty = ctx.measureText(s[1].label).width;
    ctx.fillStyle = "white";
    ctx.globalAlpha = 0.8;
    ctx.fillRect(w - 10 - tx - 10, 0, 10 + tx + 10, 10 + ty + 10);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "black";
    ctx.fillText(s[1].label, w - 10 - tx, 10 + ty);
    // ctx.fillText(s[1].label, w - 10 - ctx.measureText(s[1].label).width, 10);

    if (s[0].elt.nodeName == "VIDEO" && s[1].elt.nodeName == "VIDEO") {
      s[0].elt.addEventListener("seeked", () => {
        s[1].elt.currentTime = s[0].elt.currentTime;
      });
      s[0].elt.addEventListener("seeking", () => {
        s[1].elt.currentTime = s[0].elt.currentTime;
      });
    }
  }
  /*** Settings ***/

  /* slider creation helper */
  function create_slider(name, context, context_target, min, max, step) {
    //container for everything
    var container = document.createElement("div");
    container.className = "compare-setting";

    //slider
    var input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    if (step) {
      input.step = step;
    }
    input.value = context[context_target];

    //frame around the slider
    var frame = document.createElement("div");
    frame.className = "range-container";

    //slider name
    var label = document.createElement("label");
    label.innerHTML = name;

    //slider value
    var value = document.createElement("label");
    value.innerHTML = input.value;

    //put everything together
    container.appendChild(label);
    frame.appendChild(input);
    container.appendChild(frame);
    container.appendChild(value);

    //update the value label and the context variable
    input.addEventListener("change", function (e) {
      var v = e.currentTarget.value;
      value.innerHTML = v;
      context[context_target] = v;
    });

    return container;
  }

  function create_play_toggle(context, elt) {
    //container
    var container = document.createElement("div");
    container.className = "compare-setting";

    //play / pause
    var icon = document.createElement("div");
    icon.className = "pause";
    var videos = context.sources
      .map((c) => c.elt)
      .filter((e) => e.nodeName == "VIDEO");
    icon.addEventListener("click", function () {
      if (icon.classList.contains("play")) {
        icon.classList.replace("play", "pause");
        videos.forEach((v) => v.play());
      } else {
        icon.classList.replace("pause", "play");
        videos.forEach((v) => v.pause());
      }
    });
    elt.addEventListener("click", function () {
      if (icon.classList.contains("play")) {
        icon.classList.replace("play", "pause");
        videos.forEach((v) => v.play());
      } else {
        icon.classList.replace("pause", "play");
        videos.forEach((v) => v.pause());
      }
    });

    container.appendChild(icon);
    return container;
  }

  /* add settings bar to the DOM */
  function create_settings(elt, context) {
    //settings bar
    var settings = document.createElement("div");
    settings.className = "compare-settings";
    elt.appendChild(settings);

    //video specific settings
    var c0 = context.sources[0].elt;
    var c1 = context.sources[1].elt;
    if (c0.nodeName == "VIDEO" || c1.nodeName == "VIDEO") {
      //play pause
      var playpause = create_play_toggle(context, elt);
      settings.appendChild(playpause);

      // //video progress slider
      // var progress = create_slider("Progress", context, "progress", 0, 100, 1);
      // var slider = progress.querySelector("input");
      // //update video playback progress on slider change
      // slider.addEventListener("change", function (e) {
      //   if (c0.nodeName == "VIDEO") {
      //     c0.playbackRate = e.currentTarget.value;
      //   }
      //   if (c1.nodeName == "VIDEO") {
      //     c1.playbackRate = e.currentTarget.value;
      //   }
      // });
      // settings.appendChild(progress);

      //video speed slider
      var speed = create_slider("Speed", context, "speed", 0, 1, 0.1);
      var slider = speed.querySelector("input");
      //update video playback speed on slider change
      slider.addEventListener("change", function (e) {
        if (c0.nodeName == "VIDEO") {
          c0.playbackRate = e.currentTarget.value;
        }
        if (c1.nodeName == "VIDEO") {
          c1.playbackRate = e.currentTarget.value;
        }
      });
      settings.appendChild(speed);
    }
  }

  /*** trigger ***/

  window.addEventListener("load", setup_comparators);
});
