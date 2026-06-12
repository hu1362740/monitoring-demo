import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.esm.js',
        format: 'es',
        sourcemap: true
      },
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'MonitoringSDK',
        sourcemap: true,
        globals: {}
      }
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: 'tsconfig.json' })
    ]
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.esm.min.js',
        format: 'es',
        sourcemap: true
      },
      {
        file: 'dist/index.cjs.min.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/index.umd.min.js',
        format: 'umd',
        name: 'MonitoringSDK',
        sourcemap: true,
        globals: {}
      }
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: 'tsconfig.json' }),
      terser({
        compress: {
          drop_console: true,
          pure_funcs: ['console.log', 'console.debug']
        }
      })
    ]
  }
];
