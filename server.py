import argparse
import os
import os.path as osp
import urllib.parse
from glob import glob

from flask import Flask, make_response, render_template, send_file
from flask.views import MethodView

app = Flask(__name__)


class PathView(MethodView):
    def __init__(self, root, video1_paths, video2_paths, label1, label2):
        self.root = root
        self.video1_paths = video1_paths
        self.video2_paths = video2_paths
        self.label1 = label1
        self.label2 = label2

    def get(self, url=""):
        path = os.path.join(self.root, url)

        def get_urlname(name):
            # url from the root path
            return os.path.join("/", url, name)

        if osp.isdir(path):
            contents = [
                {
                    "label1": self.label1,
                    "label2": self.label2,
                    "path1": urllib.parse.quote(get_urlname(osp.join(path, p1))),
                    "path2": urllib.parse.quote(get_urlname(osp.join(path, p2))),
                }
                for p1, p2 in zip(self.video1_paths, self.video2_paths)
            ]
            page = render_template("index.html", contents=contents)
            res = make_response(page, 200)
        elif osp.isfile(path):
            res = send_file(os.path.abspath(path))
        else:
            res = make_response("Not found", 404)
        return res


def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("--root", type=str, default="/")
    parser.add_argument("--video1_glob", type=str)
    parser.add_argument("--video2_glob", type=str)
    parser.add_argument("--label1", type=str, default="A")
    parser.add_argument("--label2", type=str, default="B")
    parser.add_argument("--port", type=str, default="8081")
    args = parser.parse_args()

    video1_paths = sorted(glob(args.video1_glob))
    video2_paths = sorted(glob(args.video2_glob))
    assert len(video1_paths) == len(video2_paths)

    path_view = PathView.as_view(
        "path_view",
        args.root,
        video1_paths,
        video2_paths,
        args.label1,
        args.label2,
    )
    app.add_url_rule("/", view_func=path_view)
    app.add_url_rule("/<path:url>", view_func=path_view)

    app.run(port=args.port, threaded=False, debug=True)


if __name__ == "__main__":
    main()
