import React from 'react';
import { LineChart } from '../../ui/SimpleCharts';

type Props = {
  values: number[];
  stroke?: string;
  height?: number;
  width?: number;
};

/** Native + fallback: react-native-svg line chart */
export function MiniSparkline({ values, stroke = '#6366F1', height = 40, width = 120 }: Props) {
  return <LineChart width={width} height={height} values={values.length ? values : [0]} stroke={stroke} />;
}
