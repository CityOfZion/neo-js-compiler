using Neo.SmartContract.Framework;

namespace CompilerTest
{
    public class Contract1 : FunctionCode
    {
        public static void Main()
        {
            int a = 5;
            int b = 10;
            int c = 15;
            if (a > b)
            {
                a = 15;
            }

            if (a > b)
            {
                a = 1;
            }
            else
            {
                b = 1;
            }

            if (a < b)
            {
                a = 20;
            }
            else
            {
                b = 20;
            }

            if (b >= a)
            {
                a = 10;
                b = 15;
            }
            else
            {
                a = 20;
            }

            if (b <= a)
            {
                b = 20;
            }
            else
            {

            }

            if (b > a && b < c)
            {
                a = 15;
            }

            if (b >= a && b <= c)
            {
                a = 15;
            }

            if (b <= a && b < c)
            {
                a = 25;
            }

            if (a <= b || b > c)
            {
                a = 15;
            }
            else
            {
                a = 30;
            }

        }
    }
}