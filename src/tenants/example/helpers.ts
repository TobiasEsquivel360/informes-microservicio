export const helpers = {
  alineacionPara: (valor: any) => {
    if (!isNaN(Number(valor))) return "text-right";
    return "text-center";
  },
  formatoMoneda: (valor: number) => {
    return `$ ${valor.toFixed(2)}`;
  },
};
