{
  description = "NixOS electron dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  } @ inputs:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs { inherit system; };
        fhs = pkgs.buildFHSEnv {
          name = "electron-fhs-shell";
          targetPkgs = pkgs:
            (with pkgs; [
              alsa-lib
              atkmm
              at-spi2-atk
              cairo
              cups
              dbus
              expat
              glib
              glibc
              gtk2
              gtk3
              gtk4
              libdrm
              libgbm
              libxkbcommon
              mesa
              nspr
              nss
              nodejs
              pango
              udev
              twitch-cli
              yarn
            ] ++ [ # xorg stuff
              libxcomposite
              libxdamage
              libxext
              libxfixes
              libxrandr
              libx11
              libxcb-util
              libxcb
            ] ++ [ # distro packaging
              dpkg
              fakeroot
              rpm
            ]);

            # runScript = "pnpm dev";
        };
      in {
        devShells.default = fhs.env;
      }
    );
}
