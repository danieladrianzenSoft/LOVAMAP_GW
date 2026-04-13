# setup.py
from setuptools import setup, find_packages
from setuptools.command.build_py import build_py
import subprocess


class BuildProto(build_py):
    def run(self):
        # Generate protobuf files before building
        proto_dir = "schemas"
        output_dir = "lovamap_proto"  # package name

        proto_files = ["schemas/Descriptors.proto"]

        for proto_file in proto_files:
            subprocess.check_call(
                ["protoc", f"--python_out={output_dir}", f"-I{proto_dir}", proto_file]
            )

        # Continue with normal build
        super().run()


setup(
    name="lovamap-proto",
    packages=find_packages(),
    cmdclass={"build_py": BuildProto},
    install_requires=["protobuf"],
)
